import { base32 } from "./base32";
import { createHMAC } from "./hmac";
import type { SHAFamily } from "./type";

const defaultPeriod = 30;
const defaultDigits = 6;

/**
 * The secret used to derive the HMAC key for HOTP/TOTP.
 *
 * - `string`: encoded as UTF-8 bytes (default, backwards compatible).
 * - `ArrayBuffer` / `Uint8Array`: used directly as the raw HMAC key bytes. This matches
 *   the RFC 4226 / RFC 6238 convention used by most authenticator libraries, where the
 *   secret is raw bytes and base32 is only the transport encoding. Decode the base32
 *   secret once and pass the bytes here so secrets migrated from those libraries verify
 *   correctly.
 * - `CryptoKey`: an already-imported HMAC key, used as-is. Its algorithm must match the
 *   OTP hash (SHA-1), otherwise the generated code silently differs. A `CryptoKey` has no
 *   extractable bytes, so it cannot be used with `url()`.
 */
export type OTPSecret = string | ArrayBuffer | Uint8Array | CryptoKey;

/**
 * Normalises any byte source to a `Uint8Array` over its EXACT underlying bytes.
 *
 * Both the HMAC key derivation and the base32 transport (QR URL) must read the same
 * bytes. A `TypedArray` whose elements are wider than one byte (e.g. `Uint16Array`) is
 * structurally assignable to `Uint8Array` in TypeScript, so the type alone can't keep it
 * out — and the two paths would otherwise disagree (raw buffer bytes vs element-wise
 * truncation), silently locking the user out. Going through the underlying buffer makes
 * both paths agree for every view, including `subarray` views with a non-zero offset.
 */
function toBytes(secret: ArrayBuffer | ArrayBufferView): Uint8Array {
	return secret instanceof ArrayBuffer
		? new Uint8Array(secret)
		: new Uint8Array(secret.buffer, secret.byteOffset, secret.byteLength);
}

/**
 * Resolves an {@link OTPSecret} into a value that `createHMAC().sign` accepts.
 *
 * A `string` is passed through so `sign` encodes it as UTF-8 (unchanged behaviour).
 * Raw bytes are imported as the HMAC key directly — crucially WITHOUT going through
 * `TextEncoder`, which would expand any byte >= 0x80 into a 2-byte UTF-8 sequence and
 * produce the wrong key. A `CryptoKey` is returned untouched.
 *
 * Bytes are detected with `ArrayBuffer.isView` rather than `instanceof CryptoKey`, so this
 * never dereferences the `CryptoKey` global (which is not bound in every runtime).
 */
async function resolveHmacKey(
	secret: OTPSecret,
	hash: SHAFamily,
): Promise<string | CryptoKey> {
	if (typeof secret === "string") {
		return secret;
	}
	if (secret instanceof ArrayBuffer || ArrayBuffer.isView(secret)) {
		return createHMAC(hash).importKey(toBytes(secret), "sign");
	}
	return secret;
}

/**
 * loops over `expected.length` so timing never depends on input length
 *
 * @internal
 */
function constantTimeEqualOTP(input: string, expected: string): boolean {
	let difference = input.length ^ expected.length;
	for (let i = 0; i < expected.length; i++) {
		difference |= input.charCodeAt(i) ^ expected.charCodeAt(i);
	}
	return difference === 0;
}

async function generateHOTP(
	secret: OTPSecret,
	{
		counter,
		digits,
		hash = "SHA-1",
	}: {
		counter: number;
		digits?: number;
		hash?: SHAFamily;
	},
) {
	const _digits = digits ?? defaultDigits;
	if (_digits < 1 || _digits > 8) {
		throw new TypeError("Digits must be between 1 and 8");
	}
	const buffer = new ArrayBuffer(8);
	new DataView(buffer).setBigUint64(0, BigInt(counter), false);
	const bytes = new Uint8Array(buffer);
	const key = await resolveHmacKey(secret, hash);
	const hmacResult = new Uint8Array(await createHMAC(hash).sign(key, bytes));
	const offset = hmacResult[hmacResult.length - 1] & 0x0f;
	const truncated =
		((hmacResult[offset] & 0x7f) << 24) |
		((hmacResult[offset + 1] & 0xff) << 16) |
		((hmacResult[offset + 2] & 0xff) << 8) |
		(hmacResult[offset + 3] & 0xff);
	const otp = truncated % 10 ** _digits;
	return otp.toString().padStart(_digits, "0");
}

async function generateTOTP(
	secret: OTPSecret,
	options?: {
		period?: number;
		digits?: number;
		hash?: SHAFamily;
	},
) {
	const digits = options?.digits ?? defaultDigits;
	const period = options?.period ?? defaultPeriod;
	const milliseconds = period * 1000;
	const counter = Math.floor(Date.now() / milliseconds);
	return await generateHOTP(secret, { counter, digits, hash: options?.hash });
}

async function verifyTOTP(
	otp: string,
	{
		window = 1,
		digits = defaultDigits,
		secret,
		period = defaultPeriod,
	}: {
		period?: number;
		window?: number;
		digits?: number;
		secret: OTPSecret;
	},
) {
	const milliseconds = period * 1000;
	const counter = Math.floor(Date.now() / milliseconds);
	let matched = false;
	for (let i = -window; i <= window; i++) {
		const generatedOTP = await generateHOTP(secret, {
			counter: counter + i,
			digits,
		});
		matched = constantTimeEqualOTP(otp, generatedOTP) || matched;
	}
	return matched;
}

/**
 * Generate a QR code URL for the OTP secret
 */
function generateQRCode({
	issuer,
	account,
	secret,
	digits = defaultDigits,
	period = defaultPeriod,
}: {
	issuer: string;
	account: string;
	secret: OTPSecret;
	digits?: number;
	period?: number;
}) {
	if (
		typeof secret !== "string" &&
		!(secret instanceof ArrayBuffer) &&
		!ArrayBuffer.isView(secret)
	) {
		throw new TypeError(
			"Cannot build an otpauth:// URL from a CryptoKey secret; pass the raw secret bytes or a string instead.",
		);
	}
	const encodedIssuer = encodeURIComponent(issuer);
	const encodedAccountName = encodeURIComponent(account);
	const baseURI = `otpauth://totp/${encodedIssuer}:${encodedAccountName}`;
	const params = new URLSearchParams({
		secret: base32.encode(
			typeof secret === "string" ? secret : toBytes(secret),
			{
				padding: false,
			},
		),
		issuer,
	});

	if (digits !== undefined) {
		params.set("digits", digits.toString());
	}
	if (period !== undefined) {
		params.set("period", period.toString());
	}
	return `${baseURI}?${params.toString()}`;
}

export const createOTP = (
	secret: OTPSecret,
	opts?: {
		digits?: number;
		period?: number;
	},
) => {
	const digits = opts?.digits ?? defaultDigits;
	const period = opts?.period ?? defaultPeriod;
	return {
		hotp: (counter: number) => generateHOTP(secret, { counter, digits }),
		totp: () => generateTOTP(secret, { digits, period }),
		verify: (otp: string, options?: { window?: number }) =>
			verifyTOTP(otp, { secret, digits, period, ...options }),
		url: (issuer: string, account: string) =>
			generateQRCode({ issuer, account, secret, digits, period }),
	};
};
