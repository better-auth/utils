import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password (noble/scrypt)", () => {
	it("hashPassword produces salt:hex format", async () => {
		const hash = await hashPassword("mypassword");
		const parts = hash.split(":");
		expect(parts).toHaveLength(2);
		expect(parts[0]).toMatch(/^[a-f0-9]{32}$/); // 16 bytes hex salt
		expect(parts[1]).toMatch(/^[a-f0-9]{128}$/); // 64 bytes hex key
	});

	it("verifyPassword returns true for correct password", async () => {
		const hash = await hashPassword("correcthorsebatterystaple");
		expect(await verifyPassword(hash, "correcthorsebatterystaple")).toBe(true);
	});

	it("verifyPassword returns false for wrong password", async () => {
		const hash = await hashPassword("correcthorsebatterystaple");
		expect(await verifyPassword(hash, "wrongpassword")).toBe(false);
	});

	it("throws on invalid hash format", async () => {
		await expect(verifyPassword("invalidhash", "password")).rejects.toThrow(
			"Invalid password hash",
		);
	});

	it("each call produces a unique hash", async () => {
		const hash1 = await hashPassword("samepassword");
		const hash2 = await hashPassword("samepassword");
		expect(hash1).not.toBe(hash2);
	});

	it("handles empty password", async () => {
		const hash = await hashPassword("");
		expect(await verifyPassword(hash, "")).toBe(true);
		expect(await verifyPassword(hash, "notempty")).toBe(false);
	});

	it("handles very long password", async () => {
		const long = "a".repeat(1000);
		const hash = await hashPassword(long);
		expect(await verifyPassword(hash, long)).toBe(true);
		expect(await verifyPassword(hash, "a".repeat(999))).toBe(false);
	});

	it("normalizes unicode passwords (NFKC)", async () => {
		// ﬁ (U+FB01, LATIN SMALL LIGATURE FI) normalizes to "fi" under NFKC
		const hash = await hashPassword("\uFB01");
		expect(await verifyPassword(hash, "fi")).toBe(true);
	});

	it("returns false for tampered key in hash", async () => {
		const hash = await hashPassword("password");
		const [salt, key] = hash.split(":");
		const tampered = `${salt}:${"0".repeat(key!.length)}`;
		expect(await verifyPassword(tampered, "password")).toBe(false);
	});

	it("returns false for tampered salt in hash", async () => {
		const hash = await hashPassword("password");
		const [, key] = hash.split(":");
		const tampered = `${"0".repeat(32)}:${key}`;
		expect(await verifyPassword(tampered, "password")).toBe(false);
	});

	it("handles special characters in password", async () => {
		const special = "p@$$w0rd!#%^&*()";
		const hash = await hashPassword(special);
		expect(await verifyPassword(hash, special)).toBe(true);
		expect(await verifyPassword(hash, "p@$$w0rd")).toBe(false);
	});
});
