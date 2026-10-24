import { afterEach, describe, expect, it, vi } from "vitest";
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

	it("should check every TOTP window candidate without returning on first match", async () => {
		vi.resetModules();
		const sign = vi.fn(async () => {
			const buffer = new ArrayBuffer(20);
			const result = new Uint8Array(buffer);
			result[3] = 1;
			return buffer;
		});
		vi.doMock("./hmac", () => ({
			createHMAC: () => ({
				sign,
			}),
		}));
		try {
			const { createOTP: createMockedOTP } = await import("./otp");

			const isValid = await createMockedOTP("1234567890").verify("000001", {
				window: 1,
			});

			expect(isValid).toBe(true);
			expect(sign).toHaveBeenCalledTimes(3);
		} finally {
			vi.doUnmock("./hmac");
			vi.resetModules();
		}
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

describe("OTP byte secrets", () => {
	afterEach(() => vi.useRealTimers());

	const rfcSecret = "12345678901234567890";
	const rfcBytes = new TextEncoder().encode(rfcSecret);

	/** @see https://www.rfc-editor.org/rfc/rfc4226#appendix-D */
	describe.each([
		{ type: "string", key: rfcSecret },
		{ type: "Uint8Array", key: rfcBytes },
		{ type: "ArrayBuffer", key: rfcBytes.buffer },
	])("RFC 4226 with a $type key", ({ key }) => {
		it.each(
			[
				"755224",
				"287082",
				"359152",
				"969429",
				"338314",
				"254676",
				"287922",
				"162583",
				"399871",
				"520489",
			].map((code, counter) => ({ code, counter })),
		)("matches at counter $counter", async ({ code, counter }) => {
			await expect(createOTP(key).hotp(counter)).resolves.toBe(code);
		});
	});

	/** @see https://www.rfc-editor.org/rfc/rfc6238#appendix-B */
	it.each([
		[59, "94287082"],
		[1111111109, "07081804"],
		[1111111111, "14050471"],
		[1234567890, "89005924"],
		[2000000000, "69279037"],
		[20000000000, "65353130"],
	] as const)("matches RFC 6238 at %i seconds", async (seconds, code) => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(seconds * 1000);
		const otp = createOTP(rfcBytes, {
			digits: 8,
		});
		await expect(otp.totp()).resolves.toBe(code);
		await expect(otp.verify(code, { window: 0 })).resolves.toBe(true);
	});

	// Expected codes computed independently with Python's hmac/hashlib (SHA-1).
	const secret = new Uint8Array([
		0x80, 0x9f, 0xff, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x00,
		0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80, 0x90,
	]);
	const encoded = "QCP76AJDIVTYTK6N54ABAIBQIBIGA4EASA";

	it.each([
		{ type: "Uint8Array", key: secret },
		{ type: "ArrayBuffer", key: secret.buffer },
	])(
		"preserves $type secrets in HOTP, TOTP, verification and provisioning URLs",
		async ({ key }) => {
			vi.useFakeTimers({ toFake: ["Date"] });
			vi.setSystemTime(150_000);
			const otp = createOTP(key);
			await expect(otp.hotp(5)).resolves.toBe("036109");
			await expect(otp.totp()).resolves.toBe("036109");
			await expect(otp.verify("036109", { window: 0 })).resolves.toBe(true);
			await expect(otp.verify("788594")).resolves.toBe(true);
			await expect(otp.verify("686551")).resolves.toBe(true);
			await expect(otp.verify("554214")).resolves.toBe(false);
			await expect(otp.verify("000000")).resolves.toBe(false);
			const uri = new URL(otp.url("Test App", "test@example.com"));
			expect(uri.searchParams.get("secret")).toBe(encoded);
		},
	);

	it("uses the configured period and digits with byte secrets", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(1_234_567_890_000);
		const otp = createOTP(secret, { period: 60, digits: 8 });
		await expect(otp.totp()).resolves.toBe("14437248");
		await expect(otp.verify("14437248", { window: 0 })).resolves.toBe(true);
		const params = new URL(otp.url("App", "user")).searchParams;
		expect(params.get("period")).toBe("60");
		expect(params.get("digits")).toBe("8");
	});

	it("uses only the bytes in a view, including for provisioning URLs", async () => {
		const buffer = new Uint8Array(secret.length + 4).fill(0xff);
		buffer.set(secret, 2);
		const view = buffer.subarray(2, -2);
		const otp = createOTP(view);
		await expect(otp.hotp(5)).resolves.toBe("036109");
		expect(new URL(otp.url("App", "user")).searchParams.get("secret")).toBe(
			encoded,
		);
	});

	const text = "sëcret🔑";

	it.each([
		{ type: "string", key: text },
		{ type: "UTF-8 encoded", key: new TextEncoder().encode(text) },
	])("keeps UTF-8 string secrets unchanged ($type)", async ({ key }) => {
		const otp = createOTP(key);
		await expect(otp.hotp(5)).resolves.toBe("602259");
		expect(new URL(otp.url("App", "user")).searchParams.get("secret")).toBe(
			"OPB2WY3SMV2PBH4USE",
		);
	});
});
