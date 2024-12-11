import { describe, it, expect } from "vitest";
import { base64, base64Url } from "./base64";
import { binary } from "./binary";

describe("base64", () => {
	const plainText = "Hello, World!";
	const plainBuffer = new TextEncoder().encode(plainText);
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

		it("encodes an ArrayBuffer to base64", async () => {
			const result = base64.encode(plainBuffer, { padding: true });
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
	});
});
