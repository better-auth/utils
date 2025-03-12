import { describe, expect, it, vi } from "vitest";
import { createRandomStringGenerator } from "./random";
import { getRandomValues } from "uncrypto";

describe("createRandomStringGenerator", () => {
	it("generates a random string of specified length", () => {
		const generator = createRandomStringGenerator("a-z");
		const length = 16;
		const randomString = generator(length);

		expect(randomString).toBeDefined();
		expect(randomString).toHaveLength(length);
	});

	it("uses a custom alphabet to generate random strings", () => {
		const generator = createRandomStringGenerator("A-Z", "0-9");
		const randomString = generator(8);
		const allowedChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		expect([...randomString].every((char) => allowedChars.includes(char))).toBe(
			true,
		);
	});

	it("throws an error when no valid characters are provided", () => {
		expect(() => createRandomStringGenerator()).toThrowError(
			"No valid characters provided for random string generation.",
		);
	});

	it("throws an error when length is not positive", () => {
		const generator = createRandomStringGenerator("a-z");
		expect(() => generator(0)).toThrowError(
			"Length must be a positive integer.",
		);
		expect(() => generator(-5)).toThrowError(
			"Length must be a positive integer.",
		);
	});

	it("respects a new alphabet when passed during generation", () => {
		const generator = createRandomStringGenerator("a-z");
		const newAlphabet = "A-Z";
		const randomString = generator(10, newAlphabet);

		const allowedChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		expect([...randomString].every((char) => allowedChars.includes(char))).toBe(
			true,
		);
	});

	it("generates consistent randomness with valid mask calculations", () => {
		const generator = createRandomStringGenerator("0-9");
		const randomString = generator(10);
		const allowedChars = "0123456789";
		expect([...randomString].every((char) => allowedChars.includes(char))).toBe(
			true,
		);
	});

	it("combines multiple alphabets when passed during generation", () => {
		// Mock getRandomValues to return sequentially increasing values
		vi.mock("uncrypto", () => ({
			getRandomValues: vi.fn(
				<T extends ArrayBufferView | null>(array: T): T => {
					if (array instanceof Uint8Array) {
						for (let i = 0; i < array.length; i++) {
							array[i] = i % 256; // Predictable sequence for testing
						}
					}
					return array;
				},
			),
		}));

		try {
			const generator = createRandomStringGenerator("a-z");
			// Generate a long string to ensure all characters are represented
			const randomString = generator(256, "A-Z", "0-9");

			// The combined alphabet we expect
			const expectedAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

			// Should use all characters from the expected alphabet
			expect(
				[...expectedAlphabet].every((char) => randomString.includes(char)),
			).toBe(true);

			// Additionally verify that the string has expected length
			expect(randomString).toHaveLength(256);
		} finally {
			// Restore the original implementation
			vi.restoreAllMocks();
		}
	});
});
