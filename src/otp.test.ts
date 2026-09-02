import { describe, it, expect, vi } from "vitest";
import { createOTP } from "./otp";
import { base32 } from "./base32";

/**
 * Independent HOTP reference: imports the key as RAW HMAC-SHA1 bytes (the RFC way)
 * and applies the standard dynamic truncation. A passing comparison proves createOTP
 * derives its key from the raw bytes too — not via TextEncoder.
 */
async function referenceHOTP(
	keyBytes: Uint8Array,
	counter: number,
	digits = 6,
): Promise<string> {
	const key = await globalThis.crypto.subtle.importKey(
		"raw",
		keyBytes,
		{ name: "HMAC", hash: "SHA-1" },
		false,
		["sign"],
	);
	const buf = new ArrayBuffer(8);
	new DataView(buf).setBigUint64(0, BigInt(counter), false);
	const sig = new Uint8Array(
		await globalThis.crypto.subtle.sign("HMAC", key, buf),
	);
	const offset = sig[sig.length - 1] & 0x0f;
	const truncated =
		((sig[offset] & 0x7f) << 24) |
		((sig[offset + 1] & 0xff) << 16) |
		((sig[offset + 2] & 0xff) << 8) |
		(sig[offset + 3] & 0xff);
	return (truncated % 10 ** digits).toString().padStart(digits, "0");
}

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

describe("OTP raw-byte secret support (RFC 6238 migration)", () => {
	// RFC 4226 Appendix D test vectors. Secret is the ASCII string "12345678901234567890".
	const RFC4226_HOTP = [
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
	];

	it("matches the RFC 4226 HOTP test vectors when the secret is raw bytes", async () => {
		const keyBytes = new TextEncoder().encode("12345678901234567890");
		for (let counter = 0; counter < RFC4226_HOTP.length; counter++) {
			const otp = await createOTP(keyBytes, { digits: 6 }).hotp(counter);
			expect(otp).toBe(RFC4226_HOTP[counter]);
		}
	});

	it("derives the key from raw bytes, not via TextEncoder (handles bytes >= 0x80)", async () => {
		// A realistic 20-byte key: roughly half the bytes are >= 0x80.
		const keyBytes = new Uint8Array(20);
		for (let i = 0; i < keyBytes.length; i++) {
			keyBytes[i] = (i * 17 + 0x80) & 0xff;
		}

		// Raw-byte path must match an independent raw HMAC computation.
		const reference = await referenceHOTP(keyBytes, 1);
		expect(await createOTP(keyBytes, { digits: 6 }).hotp(1)).toBe(reference);

		// The old latin-1-string path runs through UTF-8 TextEncoder, which corrupts
		// bytes >= 0x80 — so it must produce a different (wrong) result. This is the bug.
		const latin1 = String.fromCharCode(...keyBytes);
		expect(await createOTP(latin1, { digits: 6 }).hotp(1)).not.toBe(reference);
	});

	it("generates and verifies a TOTP round-trip with a raw-byte secret", async () => {
		const keyBytes = new Uint8Array(20);
		for (let i = 0; i < keyBytes.length; i++) {
			keyBytes[i] = (i * 13 + 200) & 0xff;
		}
		const totp = await createOTP(keyBytes).totp();
		expect(await createOTP(keyBytes).verify(totp)).toBe(true);
	});

	it("treats a raw ArrayBuffer identically to a Uint8Array", async () => {
		const keyBytes = new Uint8Array(20);
		for (let i = 0; i < keyBytes.length; i++) {
			keyBytes[i] = (i * 11 + 130) & 0xff;
		}
		expect(await createOTP(keyBytes.buffer).hotp(3)).toBe(
			await createOTP(keyBytes).hotp(3),
		);
	});

	it("round-trips a raw-byte secret through the otpauth URL (QR and sign agree)", async () => {
		const keyBytes = new Uint8Array(20);
		for (let i = 0; i < keyBytes.length; i++) {
			keyBytes[i] = (i * 19 + 0x88) & 0xff;
		}
		// Pull the base32 secret out of the QR URL and decode it back to bytes, exactly as
		// an authenticator app would, then confirm the resulting code verifies. Guards the
		// QR path and the sign path against keying on different bytes.
		const url = createOTP(keyBytes).url("my-site.com", "account");
		const secretParam = new URL(url).searchParams.get("secret");
		expect(secretParam).toBe(base32.encode(keyBytes, { padding: false }));
		const decoded = base32.decode(secretParam ?? "");
		const code = await createOTP(decoded).totp();
		expect(await createOTP(keyBytes).verify(code)).toBe(true);
	});

	it("keys consistently on a multi-byte TypedArray view (sign and QR agree)", async () => {
		// Elements > 255: if one path read raw bytes and the other truncated per element,
		// the QR a user scans would never verify. Both must read the same underlying bytes.
		const view = new Uint16Array([0x0141, 0x0242, 0x0343, 0x0444, 0x0545]);
		const url = createOTP(view).url("my-site.com", "account");
		const secretParam = new URL(url).searchParams.get("secret");
		const decoded = base32.decode(secretParam ?? "");
		const code = await createOTP(decoded).totp();
		expect(await createOTP(view).verify(code)).toBe(true);
	});

	it("accepts an already-imported CryptoKey and matches the raw-byte result", async () => {
		const keyBytes = new Uint8Array(20);
		for (let i = 0; i < keyBytes.length; i++) {
			keyBytes[i] = (i * 7 + 0x90) & 0xff;
		}
		const cryptoKey = await globalThis.crypto.subtle.importKey(
			"raw",
			keyBytes,
			{ name: "HMAC", hash: "SHA-1" },
			false,
			["sign"],
		);
		expect(await createOTP(cryptoKey).hotp(5)).toBe(
			await createOTP(keyBytes).hotp(5),
		);
	});

	it("builds an otpauth URL from raw bytes and rejects a CryptoKey secret", async () => {
		const keyBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		const url = createOTP(keyBytes).url("my-site.com", "account");
		expect(url).toContain("otpauth://totp");
		expect(url).toContain(
			`secret=${base32.encode(keyBytes, { padding: false })}`,
		);

		const cryptoKey = await globalThis.crypto.subtle.importKey(
			"raw",
			keyBytes,
			{ name: "HMAC", hash: "SHA-1" },
			false,
			["sign"],
		);
		expect(() => createOTP(cryptoKey).url("my-site.com", "account")).toThrow(
			/CryptoKey/,
		);
	});
});
