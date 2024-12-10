import { describe, expect, it } from "vitest";
import { hmac } from "./hmac";

describe("hmac module", () => {
	const algorithm = "SHA-256";
	const testKey = "super-secret-key";
	const testData = "Hello, HMAC!";
	let signature: ArrayBuffer;

	it("imports a key for HMAC", async () => {
		const cryptoKey = await hmac.importKey(algorithm, testKey);
		expect(cryptoKey).toBeDefined();
		expect(cryptoKey.algorithm.name).toBe("HMAC");
		expect((cryptoKey.algorithm as HmacKeyAlgorithm).hash.name).toBe(algorithm);
	});

	it("signs data using HMAC", async () => {
		signature = await hmac.sign(testKey, testData);
		expect(signature).toBeInstanceOf(ArrayBuffer);
		expect(signature.byteLength).toBeGreaterThan(0);
	});

	it("verifies HMAC signature", async () => {
		const isValid = await hmac.verify(testKey, {
			signature,
			data: testData,
		});
		expect(isValid).toBe(true);
	});

	it("fails verification for modified data", async () => {
		const isValid = await hmac.verify(testKey, {
			signature,
			data: "Modified Data",
		});
		expect(isValid).toBe(false);
	});

	it("fails verification for a different key", async () => {
		const differentKey = "different-secret-key";
		const isValid = await hmac.verify(differentKey, {
			signature,
			data: testData,
		});
		expect(isValid).toBe(false);
	});
});
