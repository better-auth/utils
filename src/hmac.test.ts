import { describe, expect, it } from "vitest";
import { createHMAC } from "./hmac";

describe("hmac module", () => {
	const algorithm = "SHA-256";
	const testKey = "super-secret-key";
	const testData = "Hello, HMAC!";
	let signature: ArrayBuffer;

	it("imports a key for HMAC", async () => {
		const cryptoKey = await createHMAC().importKey(testKey, "sign");
		expect(cryptoKey).toBeDefined();
		expect(cryptoKey.algorithm.name).toBe("HMAC");
		expect((cryptoKey.algorithm as HmacKeyAlgorithm).hash.name).toBe(algorithm);
	});

	it("signs data using HMAC", async () => {
		signature = await createHMAC().sign(testKey, testData);
		expect(signature).toBeInstanceOf(ArrayBuffer);
		expect(signature.byteLength).toBeGreaterThan(0);
	});

	it("verifies HMAC signature", async () => {
		const isValid = await createHMAC().verify(testKey, testData, signature);
		expect(isValid).toBe(true);
	});

	it("fails verification for modified data", async () => {
		const isValid = await createHMAC(algorithm).verify(
			testKey,
			"Modified data",
			signature,
		);
		expect(isValid).toBe(false);
	});

	it("fails verification for a different key", async () => {
		const differentKey = "different-secret-key";
		const isValid = await createHMAC(algorithm).verify(
			differentKey,
			testData,
			signature,
		);
		expect(isValid).toBe(false);
	});
});
