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

	it("handles similar strings", () => {
		expect(safeEqual("aaaaaaaa", "aaaaaaab")).toBe(false);
	});
});
