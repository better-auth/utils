import { describe, expect, it } from "vitest";
import { createHMAC } from "./hmac";

describe("hmac module", () => {
	const algorithm = "SHA-256";
	const testKey = "super-secret-key";
	const testData = "Hello, HMAC!";

	it("imports a key for HMAC", async () => {
		const cryptoKey = await createHMAC().importKey(testKey, "sign");
		expect(cryptoKey).toBeDefined();
		expect(cryptoKey.algorithm.name).toBe("HMAC");
		expect((cryptoKey.algorithm as HmacKeyAlgorithm).hash.name).toBe(algorithm);
	});

	it("signs data using HMAC", async () => {
		const signature = await createHMAC().sign(testKey, testData);

		expect(signature).toBeInstanceOf(ArrayBuffer);
		expect(signature.byteLength).toBeGreaterThan(0);
	});

	it("verifies HMAC signature", async () => {
		const hmac = createHMAC(algorithm);
		const signature = await hmac.sign(testKey, testData);
		const isValid = await hmac.verify(testKey, testData, signature);

		expect(isValid).toBe(true);
	});

	it("fails verification for modified data", async () => {
		const hmac = createHMAC(algorithm);
		const signature = await hmac.sign(testKey, testData);
		const isValid = await hmac.verify(testKey, "Modified data", signature);

		expect(isValid).toBe(false);
	});

	it("fails verification for a different key", async () => {
		const hmac = createHMAC(algorithm);
		const signature = await hmac.sign(testKey, testData);
		const differentKey = "different-secret-key";
		const isValid = await hmac.verify(differentKey, testData, signature);

		expect(isValid).toBe(false);
	});

	it.each([
		["hex", "be961e914067801857b0429afaa685c9b31c35b8175bd2582d95a2887c5162ec"],
		["base64", "vpYekUBngBhXsEKa+qaFybMcNbgXW9JYLZWiiHxRYuw="],
		["base64url", "vpYekUBngBhXsEKa-qaFybMcNbgXW9JYLZWiiHxRYuw="],
		["base64urlnopad", "vpYekUBngBhXsEKa-qaFybMcNbgXW9JYLZWiiHxRYuw"],
	] as const)(
		"signs and verifies valid and tampered data using %s encoding",
		async (encoding, expected) => {
			const hmac = createHMAC(algorithm, encoding);
			const encodedSignature = await hmac.sign(testKey, testData);
			const replacement = encodedSignature.startsWith("0") ? "1" : "0";
			const tamperedSignature = `${replacement}${encodedSignature.slice(1)}`;

			expect(encodedSignature).toBe(expected);
			await expect(
				hmac.verify(testKey, testData, encodedSignature),
			).resolves.toBe(true);
			await expect(
				hmac.verify(testKey, testData, tamperedSignature),
			).resolves.toBe(false);
		},
	);

	it("verifies uppercase hexadecimal signatures", async () => {
		const hmac = createHMAC(algorithm, "hex");
		const encodedSignature = await hmac.sign(testKey, testData);

		await expect(
			hmac.verify(testKey, testData, encodedSignature.toUpperCase()),
		).resolves.toBe(true);
	});
});
