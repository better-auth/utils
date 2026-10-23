import { afterEach, describe, expect, it, vi } from "vitest";
import { createOTP } from "./otp";

describe("OTP byte secrets", () => {
	afterEach(() => vi.useRealTimers());

	/** @see https://www.rfc-editor.org/rfc/rfc4226#appendix-D */
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
	)("matches RFC 4226 at counter $counter", async ({ code, counter }) => {
		const secret = "12345678901234567890";
		const bytes = new TextEncoder().encode(secret);
		for (const key of [secret, bytes, bytes.buffer]) {
			expect(await createOTP(key).hotp(counter)).toBe(code);
		}
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
		vi.useFakeTimers();
		vi.setSystemTime(seconds * 1000);
		const otp = createOTP(new TextEncoder().encode("12345678901234567890"), {
			digits: 8,
		});
		expect(await otp.totp()).toBe(code);
		expect(await otp.verify(code, { window: 0 })).toBe(true);
	});

	// Expected codes computed independently with Python's hmac/hashlib (SHA-1).
	const secret = new Uint8Array([
		0x80, 0x9f, 0xff, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x00,
		0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80, 0x90,
	]);
	const encoded = "QCP76AJDIVTYTK6N54ABAIBQIBIGA4EASA";

	it("preserves binary secrets in HOTP, TOTP, verification and provisioning URLs", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(150_000);
		for (const key of [secret, secret.buffer]) {
			const otp = createOTP(key);
			expect(await otp.hotp(5)).toBe("036109");
			expect(await otp.totp()).toBe("036109");
			expect(await otp.verify("036109", { window: 0 })).toBe(true);
			expect(await otp.verify("788594")).toBe(true);
			expect(await otp.verify("686551")).toBe(true);
			expect(await otp.verify("554214")).toBe(false);
			expect(await otp.verify("000000")).toBe(false);
			const uri = new URL(otp.url("Test App", "test@example.com"));
			expect(uri.searchParams.get("secret")).toBe(encoded);
		}
	});

	it("uses the configured period and digits with byte secrets", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_234_567_890_000);
		const otp = createOTP(secret, { period: 60, digits: 8 });
		expect(await otp.totp()).toBe("14437248");
		expect(await otp.verify("14437248", { window: 0 })).toBe(true);
		const params = new URL(otp.url("App", "user")).searchParams;
		expect(params.get("period")).toBe("60");
		expect(params.get("digits")).toBe("8");
	});

	it("respects zero and expanded verification windows for byte secrets", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(150_000);
		const otp = createOTP(secret);
		expect(await otp.verify("788594", { window: 0 })).toBe(false);
		expect(await otp.verify("686551", { window: 0 })).toBe(false);
		expect(await otp.verify("554214", { window: 2 })).toBe(true);
		expect(await otp.verify("800481", { window: 2 })).toBe(true);
		expect(await otp.verify("944668", { window: 2 })).toBe(false);
		expect(await otp.verify("325873", { window: 2 })).toBe(false);
	});

	it("uses only the bytes in a view, including for provisioning URLs", async () => {
		const buffer = new Uint8Array(secret.length + 4).fill(0xff);
		buffer.set(secret, 2);
		const view = buffer.subarray(2, -2);
		const otp = createOTP(view);
		expect(await otp.hotp(5)).toBe("036109");
		expect(new URL(otp.url("App", "user")).searchParams.get("secret")).toBe(
			encoded,
		);
	});

	it("keeps UTF-8 string secrets unchanged", async () => {
		const text = "sëcret🔑";
		for (const key of [text, new TextEncoder().encode(text)]) {
			const otp = createOTP(key);
			expect(await otp.hotp(5)).toBe("602259");
			expect(new URL(otp.url("App", "user")).searchParams.get("secret")).toBe(
				"OPB2WY3SMV2PBH4USE",
			);
		}
	});
});
