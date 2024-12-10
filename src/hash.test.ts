import { describe, it, expect } from "vitest";
import { createHash } from "./hash";

describe("digest", () => {
	const inputString = "Hello, World!";
	const inputBuffer = new TextEncoder().encode(inputString);

	describe("SHA algorithms", () => {
		it("computes SHA-256 hash in raw format", async () => {
			const hash = await createHash("SHA-256").digest(inputString);
			expect(hash).toBeInstanceOf(ArrayBuffer);
		});

		it("computes SHA-512 hash in raw format", async () => {
			const hash = await createHash("SHA-512").digest(inputBuffer);
			expect(hash).toBeInstanceOf(ArrayBuffer);
		});

		it("computes SHA-256 hash in hex encoding", async () => {
			const hash = await createHash("SHA-256", "hex").digest(inputString);
			expect(typeof hash).toBe("string");
			expect(hash).toMatch(/^[a-f0-9]{64}$/);
		});

		it("computes SHA-512 hash in hex encoding", async () => {
			const hash = await createHash("SHA-512", "hex").digest(inputBuffer);
			expect(typeof hash).toBe("string");
			expect(hash).toMatch(/^[a-f0-9]{128}$/);
		});
	});

	describe("Input variations", () => {
		it("handles input as a string", async () => {
			const hash = await createHash("SHA-256").digest(inputString);
			expect(hash).toBeInstanceOf(ArrayBuffer);
		});

		it("handles input as an ArrayBuffer", async () => {
			const hash = await createHash("SHA-256").digest(inputBuffer.buffer);
			expect(hash).toBeInstanceOf(ArrayBuffer);
		});

		it("handles input as an ArrayBufferView", async () => {
			const hash = await createHash("SHA-256").digest(new Uint8Array(inputBuffer));
			expect(hash).toBeInstanceOf(ArrayBuffer);
		});
	});

	describe("Error handling", () => {
		it("throws an error for unsupported hash algorithms", async () => {
			await expect(createHash("SHA-10" as any).digest(inputString)).rejects.toThrow();
		});

		it("throws an error for invalid input types", async () => {
			await expect(createHash("SHA-256").digest({} as any)).rejects.toThrow();
		});
	});
});
