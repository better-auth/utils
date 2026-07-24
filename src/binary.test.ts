import { describe, expect, it } from "vitest";
import { binary } from "./binary";

describe("binary", () => {
	it("encodes a string", () => {
		expect(binary.encode("hi")).toEqual(new Uint8Array([104, 105]));
	});

	it("round-trips a string", () => {
		const input = "Hello World!";

		expect(binary.decode(binary.encode(input))).toBe(input);
	});
});
