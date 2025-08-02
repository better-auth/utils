import { describe, it, expect } from "vitest";
import { base64, base64Url } from "./base64";
import { binary } from "./binary";
import { Buffer } from 'node:buffer'

describe("base64", () => {
	const plainText = "Hello, World!";
	const plainBuffer = new TextEncoder().encode(plainText);
	const nodejsBuffer = Buffer.from(plainText, "utf-8");
	const base64Encoded = "SGVsbG8sIFdvcmxkIQ==";
	const base64UrlEncoded = "SGVsbG8sIFdvcmxkIQ";

	describe("encode", () => {
		it("encodes a string to base64 with padding", async () => {
			const result = base64.encode(plainText, { padding: true });
			expect(result).toBe(base64Encoded);
		});

		it("encodes a string to base64 without padding", async () => {
			const result = base64.encode(plainText, { padding: false });
			expect(result).toBe(base64Encoded.replace(/=+$/, ""));
		});

		it("encodes a string to base64 URL-safe", async () => {
			const result = base64Url.encode(plainText, {
				padding: false,
			});
			expect(result).toBe(base64UrlEncoded);
		});

		it("encodes base64url with padding when requested", async () => {
			const result = base64Url.encode(plainText, {
				padding: true,
			});
			expect(result).toBe(base64UrlEncoded + "==");
		});

		it("encodes an ArrayBuffer to base64", async () => {
			const result = base64.encode(plainBuffer, { padding: true });
			expect(result).toBe(base64Encoded);
		});

		it("encodes a Node.js Buffer to base64", async () => {
			const result = base64.encode(nodejsBuffer, { padding: true });
			const nodejsBase64Encoded = Buffer.from(plainText).toString("base64");
			expect(result).toBe(nodejsBase64Encoded);
			expect(result).toBe(base64Encoded);
		});
	});

	describe("decode", () => {
		it("decodes a base64 string", async () => {
			const encoded = Buffer.from(plainText).toString("base64");
			const result = base64.decode(encoded);
			expect(binary.decode(result)).toBe(plainText);
		});

		it("decodes a base64 URL-safe string", async () => {
			const result = base64.decode(base64UrlEncoded);
			expect(binary.decode(result)).toBe(plainText);
		});

		it("decodes a base64 string with whitespace", async () => {
			const encodedWithSpaces = "SGVs bG8s IFdv cmxk IQ==";
			const result = base64.decode(encodedWithSpaces);
			expect(binary.decode(result)).toBe(plainText);
		});

		it("throws error on invalid character in strict mode", async () => {
			const invalidBase64 = "SGVsbG8sIFdvcmxkIQ@==";
			expect(() => base64.decode(invalidBase64, { strict: true })).toThrow(
				'Invalid Base64 character: "@"',
			);
		});

		it("throws error on invalid characters even in non-strict mode", async () => {
			const base64WithInvalid = "SGVs@bG8s#IFdv$cmxk%IQ==";
			expect(() => base64.decode(base64WithInvalid, { strict: false })).toThrow(
				'Invalid Base64 character: "@"',
			);
		});

		it("throws error on unexpected padding in strict mode", async () => {
			const invalidPadding = "SGVsbG8=";
			expect(() => base64.decode(invalidPadding, { strict: true })).toThrow(
				'Unexpected "=" padding character',
			);
		});

		it("decodes base64url without padding", async () => {
			const result = base64Url.decode(base64UrlEncoded);
			expect(binary.decode(result)).toBe(plainText);
		});

		it("handles empty string", async () => {
			const result = base64.decode("");
			expect(result).toEqual(new Uint8Array(0));
		});
	});
});
