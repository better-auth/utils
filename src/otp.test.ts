import { describe, it, expect, vi } from "vitest";
import { constantTimeEqual, createOTP } from "./otp";

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

	it("should verify with a window greater than 1", async () => {
		const secret = "1234567890";
		const totp = await createOTP(secret).totp();
		const isValid = await createOTP(secret).verify(totp, { window: 2 });
		expect(isValid).toBe(true);
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

describe("constant-time OTP comparison", () => {
	it("returns true for equal strings and false for differing ones", () => {
		expect(constantTimeEqual("123456", "123456")).toBe(true);
		expect(constantTimeEqual("123456", "123457")).toBe(false);
		expect(constantTimeEqual("123456", "923456")).toBe(false);
		expect(constantTimeEqual("", "")).toBe(true);
	});

	it("returns false for strings of different lengths", () => {
		expect(constantTimeEqual("123456", "1234567")).toBe(false);
		expect(constantTimeEqual("1234567", "123456")).toBe(false);
		expect(constantTimeEqual("123456", "")).toBe(false);
		expect(constantTimeEqual("", "123456")).toBe(false);
		// A correct prefix that is shorter must not be accepted, which would
		// be the failure mode of a length-leaking early return.
		expect(constantTimeEqual("123", "123456")).toBe(false);
	});

	it("handles multi-byte unicode without early-return mismatches", () => {
		expect(constantTimeEqual("café", "café")).toBe(true);
		expect(constantTimeEqual("café", "cafe")).toBe(false);
	});

	it("does not short-circuit on the matching-prefix length", () => {
		// Regression for the timing side channel: comparison time must not
		// correlate with how many leading characters match. We measure the
		// mean comparison time for a candidate that mismatches at the first
		// character versus one that matches all but the last character; a
		// short-circuiting `===` makes the late-mismatch case measurably
		// slower, while a constant-time compare keeps them indistinguishable.
		const target = "9".repeat(4096);
		const earlyMismatch = "0" + "9".repeat(4095);
		const lateMismatch = "9".repeat(4095) + "0";

		const time = (candidate: string) => {
			const iterations = 2000;
			// Warm up to reduce JIT noise before timing.
			for (let i = 0; i < 200; i++) constantTimeEqual(candidate, target);
			const start = performance.now();
			for (let i = 0; i < iterations; i++) {
				constantTimeEqual(candidate, target);
			}
			return (performance.now() - start) / iterations;
		};

		const early = time(earlyMismatch);
		const late = time(lateMismatch);
		// Both inputs are full length and fully scanned, so timings should be
		// within the same order of magnitude regardless of mismatch position.
		const ratio = Math.max(early, late) / Math.max(Math.min(early, late), 1e-9);
		expect(ratio).toBeLessThan(5);
	});
});
