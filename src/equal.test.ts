import { describe, it, expect, vi } from "vitest";
import { safeEqual, safeEqualFallback } from "./equal";

describe("safeEqualFallback", () => {
	it("returns true for identical strings", () => {
		expect(safeEqualFallback("hello", "hello")).toBe(true);
	});

	it("returns false for different strings", () => {
		expect(safeEqualFallback("hello", "world")).toBe(false);
	});

	it("returns false for strings of different lengths", () => {
		expect(safeEqualFallback("short", "longer")).toBe(false);
	});

	it("handles empty strings", () => {
		expect(safeEqualFallback("", "")).toBe(true);
		expect(safeEqualFallback("", "a")).toBe(false);
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

		safeEqualFallback(a, b);

		// Each loop accesses both a[i] and b[i], so total calls = length * 2
		expect(iterations).toBe(a.length * 2);

		String.prototype.charCodeAt = originalCharCodeAt;
	});
});

describe("safeEqual", () => {
	it("returns true for identical strings", async () => {
		expect(await safeEqual("hello", "hello")).toBe(true);
	});

	it("returns false for different strings", async () => {
		expect(await safeEqual("hello", "world")).toBe(false);
	});

	it("returns false for strings of different lengths", async () => {
		expect(await safeEqual("short", "longer")).toBe(false);
	});

	it("falls back correctly if crypto.timingSafeEqual is unavailable", async () => {
		vi.stubGlobal("import", async () => {
			throw new Error("crypto not available");
		});

		expect(await safeEqual("hello", "hello")).toBe(true);
		expect(await safeEqual("hello", "world")).toBe(false);

		vi.restoreAllMocks();
	});
});
