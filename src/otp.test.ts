import { describe, it, expect, vi } from "vitest";
import { createOTP } from "./otp";

describe("HOTP and TOTP Generation Tests", () => {
	it("should generate a valid HOTP for a given counter", async () => {
		const key = "1234567890";
		const counter = 1;
		const digits = 6;
		const otp = await createOTP(key, {
			digits,
		}).hotp(counter);
		expect(otp).toBeTypeOf("string");
		expect(otp.length).toBe(digits);
	});

	it("should throw error if digits is not between 1 and 8", async () => {
		const key = "1234567890";
		const counter = 1;

		await expect(
			createOTP(key, {
				digits: 9,
			}).hotp(counter),
		).rejects.toThrow("Digits must be between 1 and 8");
		await expect(
			createOTP(key, {
				digits: 0,
			}).hotp(counter),
		).rejects.toThrow("Digits must be between 1 and 8");
	});

	it("should generate a valid TOTP based on current time", async () => {
		const secret = "1234567890";
		const digits = 6;

		const otp = await createOTP(secret, {
			digits,
		}).totp();
		expect(otp).toBeTypeOf("string");
		expect(otp.length).toBe(digits);
	});

	it("should generate different OTPs after each time window", async () => {
		const secret = "1234567890";
		const seconds = 30;
		const digits = 6;

		const otp1 = await createOTP(secret, {
			period: seconds,
			digits,
		}).totp();
		vi.useFakeTimers();
		await vi.advanceTimersByTimeAsync(30000);
		const otp2 = await createOTP(secret, {
			period: seconds,
			digits,
		}).totp();
		expect(otp1).not.toBe(otp2);
	});

	it("should verify correct TOTP against generated value", async () => {
		const secret = "1234567890";
		const totp = await createOTP(secret).totp();
		const isValid = await createOTP(secret).verify(totp);
		expect(isValid).toBe(true);
	});

	it("should return false for incorrect TOTP", async () => {
		const secret = "1234567890";
		const invalidTOTP = "000000";

		const isValid = await createOTP(secret).verify(invalidTOTP);
		console.log(isValid);
		expect(isValid).toBe(false);
	});

	it("should verify TOTP within the window", async () => {
		const secret = "1234567890";
		const totp = await createOTP(secret).totp();
		const isValid = await createOTP(secret).verify(totp, { window: 1 });
		expect(isValid).toBe(true);
	});

	it("should return false for TOTP outside the window", async () => {
		const secret = "1234567890";
		const totp = await createOTP(secret).totp();
		const isValid = await createOTP(secret).verify(totp, { window: -1 });
		expect(isValid).toBe(false);
	});

	it("should generate a valid QR code URL", () => {
		const secret = "1234567890";
		const issuer = "my-site.com";
		const account = "account";
		const url = createOTP(secret).url(issuer, account);
		expect(url).toBeTypeOf("string");
		expect(url).toContain("otpauth://totp");
	});
});
