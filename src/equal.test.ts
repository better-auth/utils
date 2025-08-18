import { describe, it, expect } from "vitest";
import { safeEqual } from "./equal";

describe("safeEqualFallback", () => {
	it("returns true for identical strings", () => {
		expect(safeEqual("hello", "hello")).toBe(true);
	});

	it("returns false for different strings", () => {
		expect(safeEqual("hello", "world")).toBe(false);
	});

	it("returns false for strings of different lengths", () => {
		expect(safeEqual("short", "longer")).toBe(false);
	});

	it("handles empty strings", () => {
		expect(safeEqual("", "")).toBe(true);
		expect(safeEqual("", "a")).toBe(false);
	});

	it("performs constant-time operations for strings of equal length", () => {
		const a = "aaaaaa";
		const b = "bbbbbb";

		let iterations = 0;
		const originalCharCodeAt = String.prototype.charCodeAt;

		String.prototype.charCodeAt = function (index: number) {
			iterations++;
			return originalCharCodeAt.call(this, index);
		};

		safeEqual(a, b);

		// Each loop accesses both a[i] and b[i], so total calls = length * 2
		expect(iterations).toBe(a.length * 2);

		String.prototype.charCodeAt = originalCharCodeAt;
	});
});
