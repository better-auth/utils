import { base32 } from "./base32";
import { createHMAC } from "./hmac";
import type { SHAFamily } from "./type";

const defaultPeriod = 30;
const defaultDigits = 6;

async function generateHOTP(
	secret: string,
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
	const hmacResult = new Uint8Array(await createHMAC(hash).sign(secret, bytes));
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
	secret: string,
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
		secret: string;
	},
) {
	const milliseconds = period * 1000;
	const counter = Math.floor(Date.now() / milliseconds);
	for (let i = -window; i <= window; i++) {
		const generatedOTP = await generateHOTP(secret, {
			counter: counter + i,
			digits,
		});
		if (otp === generatedOTP) {
			return true;
		}
	}
	return false;
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
	secret: string;
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

export const createOTP = (
	secret: string,
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
