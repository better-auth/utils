import { describe, it, expect } from "vitest";
import { digest } from "./digest";

describe("digest", () => {
	const inputString = "Hello, World!";
	const inputBuffer = new TextEncoder().encode(inputString);

	describe("SHA algorithms", () => {
		it("computes SHA-256 hash in raw format", async () => {
			const hash = await digest(inputString, "SHA-256");
			expect(hash).toBeInstanceOf(ArrayBuffer);
		});

		it("computes SHA-512 hash in raw format", async () => {
			const hash = await digest(inputBuffer, "SHA-512");
			expect(hash).toBeInstanceOf(ArrayBuffer);
		});

		it("computes SHA-256 hash in hex encoding", async () => {
			const hash = await digest(inputString, "SHA-256", "hex");
			expect(typeof hash).toBe("string");
			expect(hash).toMatch(/^[a-f0-9]{64}$/); // 64 hex characters for SHA-256
		});

		it("computes SHA-512 hash in hex encoding", async () => {
			const hash = await digest(inputBuffer, "SHA-512", "hex");
			expect(typeof hash).toBe("string");
			expect(hash).toMatch(/^[a-f0-9]{128}$/); // 128 hex characters for SHA-512
		});
	});

	describe("Input variations", () => {
		it("handles input as a string", async () => {
			const hash = await digest(inputString, "SHA-256");
			expect(hash).toBeInstanceOf(ArrayBuffer);
		});

		it("handles input as an ArrayBuffer", async () => {
			const hash = await digest(inputBuffer.buffer, "SHA-256");
			expect(hash).toBeInstanceOf(ArrayBuffer);
		});

		it("handles input as an ArrayBufferView", async () => {
			const hash = await digest(inputBuffer, "SHA-256");
			expect(hash).toBeInstanceOf(ArrayBuffer);
		});
	});

	describe("Error handling", () => {
		it("throws an error for unsupported hash algorithms", async () => {
			await expect(digest(inputString, "SHA-10" as any)).rejects.toThrow();
		});

		it("throws an error for invalid input types", async () => {
			await expect(digest({} as any, "SHA-256")).rejects.toThrow();
		});
	});
});
