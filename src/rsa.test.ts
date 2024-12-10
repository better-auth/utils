import { rsa } from "./rsa"; // Import the RSA module
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("RSA Module", () => {
	const mockKeyPair = {
		publicKey: {} as CryptoKey,
		privateKey: {} as CryptoKey,
	};

	beforeEach(() => {
		vi.spyOn(globalThis.crypto.subtle, "generateKey").mockResolvedValue(
			mockKeyPair,
		);
		vi.spyOn(globalThis.crypto.subtle, "exportKey").mockResolvedValue(
			new ArrayBuffer(16),
		);
		vi.spyOn(globalThis.crypto.subtle, "importKey").mockResolvedValue(
			mockKeyPair.publicKey,
		);
		vi.spyOn(globalThis.crypto.subtle, "encrypt").mockResolvedValue(
			new ArrayBuffer(16),
		);
		vi.spyOn(globalThis.crypto.subtle, "decrypt").mockResolvedValue(
			new ArrayBuffer(16),
		);
		vi.spyOn(globalThis.crypto.subtle, "sign").mockResolvedValue(
			new ArrayBuffer(16),
		);
		vi.spyOn(globalThis.crypto.subtle, "verify").mockResolvedValue(true);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("generateKeyPair", () => {
		it("should generate an RSA key pair", async () => {
			const keyPair = await rsa.generateKeyPair();

			expect(keyPair).toBe(mockKeyPair);
			expect(globalThis.crypto.subtle.generateKey).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "RSA-OAEP",
					modulusLength: 2048,
					publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
					hash: { name: "SHA-256" },
				}),
				true,
				["encrypt", "decrypt"],
			);
		});
	});

	describe("exportKey", () => {
		it("should export a key in the given format", async () => {
			const exportedKey = await rsa.exportKey(mockKeyPair.publicKey, "jwk");

			expect(exportedKey).toBeInstanceOf(ArrayBuffer);
			expect(globalThis.crypto.subtle.exportKey).toHaveBeenCalledWith(
				"jwk",
				mockKeyPair.publicKey,
			);
		});
	});

	describe("importKey", () => {
		it("should import a key from JWK format", async () => {
			const mockJWK: JsonWebKey = {
				kty: "RSA",
				e: "AQAB",
				n: "some-modulus",
				alg: "RSA-OAEP",
			};

			const importedKey = await rsa.importKey(mockJWK, "encrypt");

			expect(importedKey).toBe(mockKeyPair.publicKey);
			expect(globalThis.crypto.subtle.importKey).toHaveBeenCalledWith(
				"jwk",
				mockJWK,
				expect.objectContaining({ name: "RSA-OAEP" }),
				true,
				["encrypt"],
			);
		});
	});

	describe("encrypt", () => {
		it("should encrypt data using RSA-OAEP", async () => {
			const data = "test data";
			const encryptedData = await rsa.encrypt(mockKeyPair.publicKey, data);

			expect(encryptedData).toBeInstanceOf(ArrayBuffer);
			expect(globalThis.crypto.subtle.encrypt).toHaveBeenCalledWith(
				{ name: "RSA-OAEP" },
				mockKeyPair.publicKey,
				new TextEncoder().encode(data),
			);
		});
	});

	describe("decrypt", () => {
		it("should decrypt data using RSA-OAEP", async () => {
			const encryptedData = new ArrayBuffer(16);
			const decryptedData = await rsa.decrypt(
				mockKeyPair.privateKey,
				encryptedData,
			);

			expect(decryptedData).toBeInstanceOf(ArrayBuffer);
			expect(globalThis.crypto.subtle.decrypt).toHaveBeenCalledWith(
				{ name: "RSA-OAEP" },
				mockKeyPair.privateKey,
				encryptedData,
			);
		});
	});

	describe("sign", () => {
		it("should sign data using RSA-PSS", async () => {
			const data = "test data";
			const signature = await rsa.sign(mockKeyPair.privateKey, data);

			expect(signature).toBeInstanceOf(ArrayBuffer);
			expect(globalThis.crypto.subtle.sign).toHaveBeenCalledWith(
				{ name: "RSA-PSS", saltLength: 32 },
				mockKeyPair.privateKey,
				new TextEncoder().encode(data),
			);
		});
	});

	describe("verify", () => {
		it("should verify data using RSA-PSS", async () => {
			const signature = new ArrayBuffer(16);
			const data = "test data";
			const isValid = await rsa.verify(mockKeyPair.publicKey, {
				signature,
				data,
			});

			expect(isValid).toBe(true);
			expect(globalThis.crypto.subtle.verify).toHaveBeenCalledWith(
				{ name: "RSA-PSS", saltLength: 32 },
				mockKeyPair.publicKey,
				signature,
				new TextEncoder().encode(data),
			);
		});
	});
});
