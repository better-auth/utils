import { describe, it, expect, vi } from "vitest";
import { createOTP } from "./otp";

const { generateHOTP, generateTOTP, verifyTOTP } = createOTP();
describe("HOTP and TOTP Generation Tests", () => {
	it("should generate a valid HOTP for a given counter", async () => {
		const key = "1234567890";
		const counter = 1;
		const digits = 6;

		const otp = await generateHOTP(key, {
			counter,
		});
		expect(otp).toBeTypeOf("string");
		expect(otp.length).toBe(digits);
	});

	it("should throw error if digits is not between 1 and 8", async () => {
		const key = "1234567890";
		const counter = 1;

		await expect(
			generateHOTP(key, {
				counter,
				digits: 9,
			}),
		).rejects.toThrow("Digits must be between 1 and 8");
		await expect(
			generateHOTP(key, {
				counter,
				digits: 0,
			}),
		).rejects.toThrow("Digits must be between 1 and 8");
	});

	it("should generate a valid TOTP based on current time", async () => {
		const secret = "1234567890";
		const milliseconds = 3000;
		const digits = 6;

		const otp = await generateTOTP(secret, { milliseconds, digits });
		expect(otp).toBeTypeOf("string");
		expect(otp.length).toBe(digits);
	});

	it("should generate different OTPs after each time window", async () => {
		const secret = "1234567890";
		const milliseconds = 3000;
		const digits = 6;

		const otp1 = await generateTOTP(secret, { milliseconds, digits });
		vi.useFakeTimers();
		await vi.advanceTimersByTimeAsync(milliseconds);
		const otp2 = await generateTOTP(secret, { milliseconds, digits });
		expect(otp1).not.toBe(otp2);
	});

	it("should verify correct TOTP against generated value", async () => {
		const secret = "1234567890";
		const totp = await generateTOTP(secret, { milliseconds: 3000, digits: 6 });

		const isValid = await verifyTOTP(totp, { secret });
		expect(isValid).toBe(true);
	});

	it("should return false for incorrect TOTP", async () => {
		const secret = "1234567890";
		const invalidTOTP = "000000";

		const isValid = await verifyTOTP(invalidTOTP, { secret });
		expect(isValid).toBe(false);
	});

	it("should verify TOTP within the window", async () => {
		const secret = "1234567890";
		const totp = await generateTOTP(secret, { milliseconds: 3000, digits: 6 });
		const isValid = await verifyTOTP(totp, { secret, window: 1 });
		expect(isValid).toBe(true);
	});

	it("should return false for TOTP outside the window", async () => {
		const secret = "1234567890";
		const totp = await generateTOTP(secret, { milliseconds: 3000, digits: 6 });
		const isValid = await verifyTOTP(totp, { secret, window: -1 });
		expect(isValid).toBe(false);
	});
});
