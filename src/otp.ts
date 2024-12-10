import { hmac } from "./hmac";
import type { SHAFamily } from "./type";

export const createOTP = (
	hash: SHAFamily = "SHA-1",
	digits = 6,
	seconds = 30,
) => {
	const defaultSeconds = seconds;
	const defaultDigits = digits;
	async function generateHOTP(
		secret: string,
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
		const hmacResult = new Uint8Array(await hmac.sign(secret, bytes, hash));
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
		{
			milliseconds = 3000,
			digits = defaultDigits,
		}: {
			milliseconds?: number;
			digits?: number;
		},
	) {
		const counter = Math.floor(Date.now() / milliseconds);
		return await generateHOTP(secret, { counter, digits });
	}

	async function verifyTOTP(
		otp: string,
		{
			window = 1,
			digits = defaultDigits,
			secret,
			seconds = defaultSeconds,
		}: {
			seconds?: number;
			window?: number;
			digits?: number;
			secret: string;
		},
	) {
		const milliseconds = seconds * 1000;
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
	return {
		generateHOTP,
		generateTOTP,
		verifyTOTP,
	};
};
