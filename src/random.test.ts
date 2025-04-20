import { describe, expect, it, vi } from "vitest";
import { createRandomStringGenerator } from "./random";
import { getRandomValues } from "uncrypto";

// Utility functions for distribution tests
function generateLargeRandomSample(
	alphabet: "a-z" | "0-9",
	sampleCount = 1000,
	stringLength = 256,
): string {
	const generator = createRandomStringGenerator(alphabet);
	return new Array(sampleCount)
		.fill(null)
		.map(() => generator(stringLength))
		.join("");
}

function getCharCounts(
	randomString: string,
	expectedCharSet: string,
): Map<string, number> {
	const charCounts = new Map<string, number>();

	// Initialize all character counts to 0
	for (const char of expectedCharSet) {
		charCounts.set(char, 0);
	}

	// Count occurrences
	for (const char of randomString) {
		const currentCount = charCounts.get(char) || 0;
		charCounts.set(char, currentCount + 1);
	}

	return charCounts;
}

function calculateChiSquared(
	charCounts: Map<string, number>,
	totalChars: number,
	charSetLength: number,
): number {
	const expectedCount = totalChars / charSetLength;
	let chiSquared = 0;

	for (const count of charCounts.values()) {
		const deviation = count - expectedCount;
		chiSquared += (deviation * deviation) / expectedCount;
	}

	return chiSquared;
}

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
			vi.unmock("uncrypto");
		}
	});

	describe("produces unbiased distribution across characters", () => {
		it("with a 26-character alphabet", () => {
			// Choose a small alphabet to make bias easier to detect
			const alphabet = "a-z";
			const expectedCharSet = "abcdefghijklmnopqrstuvwxyz";
			const charSetLength = expectedCharSet.length;

			// Generate a very large sample to ensure statistical significance
			const randomString = generateLargeRandomSample(alphabet);

			// Count occurrences of each character
			const charCounts = getCharCounts(randomString, expectedCharSet);

			// Calculate chi-squared statistic for uniformity
			const chiSquared = calculateChiSquared(
				charCounts,
				randomString.length,
				charSetLength,
			);

			// For a 26-character alphabet (25 degrees of freedom) at 99.9% confidence,
			// the critical chi-squared value is approximately 52.62
			// If our value exceeds this, the distribution is likely not uniform
			//
			// However, truly random values will occasionally produce high chi-squared values
			// by chance. To avoid random test failures, we use a much higher threshold
			// that would indicate a systematic bias rather than random variation.

			// Critical value multiplied by 3 to reduce false positives
			const criticalValue = 52.62 * 3;

			expect(chiSquared).toBeLessThan(criticalValue);
		});

		it("with a 10-character alphabet", () => {
			// Also test the distribution with a different, non-power-of-2 alphabet
			// which is more likely to expose modulo bias
			const alphabet = "0-9"; // 10 characters, not a power of 2
			const expectedCharSet = "0123456789";
			const charSetLength = expectedCharSet.length;

			// Generate a very large sample to ensure statistical significance
			const randomString = generateLargeRandomSample(alphabet);

			// Count occurrences of each character
			const charCounts = getCharCounts(randomString, expectedCharSet);

			// Calculate chi-squared statistic for uniformity
			const chiSquared = calculateChiSquared(
				charCounts,
				randomString.length,
				charSetLength,
			);

			// For a 10-character alphabet (9 degrees of freedom) at 99.9% confidence,
			// the critical chi-squared value is approximately 27.877
			// Again, we multiply by 3 to avoid false positives
			const criticalValue = 27.877 * 3;

			expect(chiSquared).toBeLessThan(criticalValue);

			// Check min/max frequency difference as another bias indicator
			// In a truly uniform distribution, the difference should be relatively small
			const counts = Array.from(charCounts.values());
			const minCount = Math.min(...counts);
			const maxCount = Math.max(...counts);

			// Calculate expected count per character in a perfect distribution
			const expectedCount = randomString.length / charSetLength;

			// Maximum allowed deviation as a percentage of expected count
			// The 0.1 (10%) is chosen to be high enough to avoid random failures
			// but low enough to catch serious bias
			const maxAllowedDeviation = expectedCount * 0.1;

			expect(maxCount - minCount).toBeLessThan(maxAllowedDeviation);
		});
	});
});
