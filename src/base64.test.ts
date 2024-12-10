import { describe, it, expect } from "vitest";
import { base64 } from "./base64";

describe("base64", () => {
	const plainText = "Hello, World!";
	const plainBuffer = new TextEncoder().encode(plainText);
	const base64Encoded = "SGVsbG8sIFdvcmxkIQ==";
	const base64UrlEncoded = "SGVsbG8sIFdvcmxkIQ";

	describe("encode", () => {
		it("encodes a string to base64 with padding", async () => {
			const result = await base64.encode(plainText, { padding: true });
			expect(result).toBe(base64Encoded);
		});

		it("encodes a string to base64 without padding", async () => {
			const result = await base64.encode(plainText, { padding: false });
			expect(result).toBe(base64Encoded.replace(/=+$/, ""));
		});

		it("encodes a string to base64 URL-safe", async () => {
			const result = await base64.encode(plainText, {
				urlSafe: true,
				padding: false,
			});
			expect(result).toBe(base64UrlEncoded);
		});

		it("encodes an ArrayBuffer to base64", async () => {
			const result = await base64.encode(plainBuffer, { padding: true });
			expect(result).toBe(base64Encoded);
		});
	});

	describe("decode", () => {
		it("decodes a base64 string to a Uint8Array", async () => {
			const result = await base64.decode(base64Encoded);
			expect(new TextDecoder().decode(result)).toBe(plainText);
		});

		it("decodes a base64 URL-safe string to a Uint8Array", async () => {
			const result = await base64.decode(base64UrlEncoded);
			expect(new TextDecoder().decode(result)).toBe(plainText);
		});

		it("throws an error for invalid characters", async () => {
			const invalidBase64 = "SGVsbG8s#";
			await expect(base64.decode(invalidBase64)).rejects.toThrow(
				"Invalid character",
			);
		});
	});
});
