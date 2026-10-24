import { base32 } from "./base32";
import { createHMAC } from "./hmac";

const defaultPeriod = 30;
const defaultDigits = 6;
const hmac = createHMAC("SHA-1");

/**
 * Secrets stay as bytes so `url()` can encode them synchronously.
 * A `CryptoKey` only exposes its bytes when extractable and fixes its own hash.
 */
type OTPSecret = string | Uint8Array | ArrayBuffer;

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
	key: CryptoKey,
	{
		counter,
		digits,
	}: {
		counter: number;
		digits?: number;
	},
) {
	const _digits = digits ?? defaultDigits;
	if (_digits < 1 || _digits > 8) {
		throw new TypeError("Digits must be between 1 and 8");
	}
	const buffer = new ArrayBuffer(8);
	new DataView(buffer).setBigUint64(0, BigInt(counter), false);
	const bytes = new Uint8Array(buffer);
	const signature = await hmac.sign(key, bytes);
	const hmacResult = new Uint8Array(signature);
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
	key: CryptoKey,
	options?: {
		period?: number;
		digits?: number;
	},
) {
	const digits = options?.digits ?? defaultDigits;
	const period = options?.period ?? defaultPeriod;
	const milliseconds = period * 1000;
	const counter = Math.floor(Date.now() / milliseconds);
	return await generateHOTP(key, { counter, digits });
}

async function verifyTOTP(
	otp: string,
	{
		window = 1,
		digits = defaultDigits,
		key,
		period = defaultPeriod,
	}: {
		period?: number;
		window?: number;
		digits?: number;
		key: CryptoKey;
	},
) {
	const milliseconds = period * 1000;
	const counter = Math.floor(Date.now() / milliseconds);
	let matched = false;
	for (let i = -window; i <= window; i++) {
		const generatedOTP = await generateHOTP(key, {
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
	const encodedIssuer = encodeURIComponent(issuer);
	const encodedAccountName = encodeURIComponent(account);
	const baseURI = `otpauth://totp/${encodedIssuer}:${encodedAccountName}`;
	const params = new URLSearchParams({
		secret: base32.encode(secret, {
			padding: false,
		}),
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

/**
 * Strings are used as UTF-8 bytes.
 * Decode encoded secrets, such as Base32, before passing them in.
 */
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
		hotp: async (counter: number) => {
			const key = await hmac.importKey(secret, "sign");
			return generateHOTP(key, { counter, digits });
		},
		totp: async () => {
			const key = await hmac.importKey(secret, "sign");
			return generateTOTP(key, { digits, period });
		},
		verify: async (otp: string, options?: { window?: number }) => {
			const key = await hmac.importKey(secret, "sign");
			return verifyTOTP(otp, { key, digits, period, ...options });
		},
		url: (issuer: string, account: string) => {
			return generateQRCode({ issuer, account, secret, digits, period });
		},
	};
};
