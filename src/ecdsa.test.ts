import { describe, it, expect } from "vitest";
import { ecdsa } from "./ecdsa";

describe("ecdsa", () => {
	const testCurve = "P-256";

	describe("generateKeyPair", () => {
		it("generates a valid ECDSA key pair", async () => {
			const { privateKey, publicKey } = await ecdsa.generateKeyPair(testCurve);
			expect(privateKey).toBeInstanceOf(ArrayBuffer);
			expect(publicKey).toBeInstanceOf(ArrayBuffer);
		});
	});

	describe("importPrivateKey", () => {
		it("imports a private key successfully", async () => {
			const { privateKey } = await ecdsa.generateKeyPair(testCurve);
			const importedKey = await ecdsa.importPrivateKey(privateKey, testCurve);
			expect(importedKey.type).toBe("private");
			expect(importedKey.algorithm.name).toBe("ECDSA");
		});
	});

	describe("importPublicKey", () => {
		it("imports a public key successfully", async () => {
			const { publicKey } = await ecdsa.generateKeyPair(testCurve);
			const importedKey = await ecdsa.importPublicKey(publicKey, testCurve);
			expect(importedKey.type).toBe("public");
			expect(importedKey.algorithm.name).toBe("ECDSA");
		});
	});

	describe("sign", () => {
		it("signs data using a private key", async () => {
			const { privateKey } = await ecdsa.generateKeyPair(testCurve);
			const privateCryptoKey = await ecdsa.importPrivateKey(
				privateKey,
				testCurve,
			);
			const data = "Hello, ECDSA!";
			const signature = await ecdsa.sign(privateCryptoKey, data);
			expect(signature).toBeInstanceOf(ArrayBuffer);
		});
	});

	describe("verify", () => {
		it("verifies a signature using the corresponding public key", async () => {
			const { privateKey, publicKey } = await ecdsa.generateKeyPair(testCurve);
			const privateCryptoKey = await ecdsa.importPrivateKey(
				privateKey,
				testCurve,
			);
			const publicCryptoKey = await ecdsa.importPublicKey(publicKey, testCurve);

			const data = "Hello, ECDSA!";
			const signature = await ecdsa.sign(privateCryptoKey, data);
			const isValid = await ecdsa.verify(publicCryptoKey, { signature, data });
			expect(isValid).toBe(true);
		});

		it("fails to verify with incorrect data", async () => {
			const { privateKey, publicKey } = await ecdsa.generateKeyPair(testCurve);
			const privateCryptoKey = await ecdsa.importPrivateKey(
				privateKey,
				testCurve,
			);
			const publicCryptoKey = await ecdsa.importPublicKey(publicKey, testCurve);

			const originalData = "Hello, ECDSA!";
			const tamperedData = "Tampered Data!";
			const signature = await ecdsa.sign(privateCryptoKey, originalData);
			const isValid = await ecdsa.verify(publicCryptoKey, {
				signature,
				data: tamperedData,
			});
			expect(isValid).toBe(false);
		});
	});

	describe("exportKey", () => {
		it("exports a private key in pkcs8 format", async () => {
			const { privateKey } = await ecdsa.generateKeyPair(testCurve);
			const privateCryptoKey = await ecdsa.importPrivateKey(
				privateKey,
				testCurve,
				true,
			);
			const exportedKey = await ecdsa.exportKey(privateCryptoKey, "pkcs8");
			expect(exportedKey).toBeInstanceOf(ArrayBuffer);
		});

		it("exports a public key in spki format", async () => {
			const { publicKey } = await ecdsa.generateKeyPair(testCurve);
			const publicCryptoKey = await ecdsa.importPublicKey(
				publicKey,
				testCurve,
				true,
			);
			const exportedKey = await ecdsa.exportKey(publicCryptoKey, "spki");
			expect(exportedKey).toBeInstanceOf(ArrayBuffer);
		});

		it("exports a key in jwk format", async () => {
			const { publicKey } = await ecdsa.generateKeyPair(testCurve);
			const publicCryptoKey = await ecdsa.importPublicKey(
				publicKey,
				testCurve,
				true,
			);
			const exportedKey = await ecdsa.exportKey(publicCryptoKey, "jwk");
			expect(exportedKey).toHaveProperty("kty", "EC");
			expect(exportedKey).toHaveProperty("crv", testCurve);
		});
	});
});
