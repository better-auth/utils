import { describe, it, expect } from "vitest";
import { hex } from "./hex";

describe("hex", () => {
	describe("encode", () => {
		it("should encode a string to hexadecimal", () => {
			const input = "Hello, World!";
			expect(hex.encode(input)).toBe(Buffer.from(input).toString("hex"));
		});

		it("should encode an ArrayBuffer to hexadecimal", () => {
			const input = new TextEncoder().encode("Hello").buffer;
			expect(hex.encode(input)).toBe(Buffer.from(input).toString("hex"));
		});

		it("should encode a TypedArray to hexadecimal", () => {
			const input = new Uint8Array([72, 101, 108, 108, 111]);
			expect(hex.encode(input)).toBe(Buffer.from(input).toString("hex"));
		});
	});

	describe("decode", () => {
		it("should decode a hexadecimal string to its original value", () => {
			const expected = "Hello, World!";
			expect(hex.decode(Buffer.from(expected).toString("hex"))).toBe(expected);
		});

		it("should handle decoding of a hexadecimal string to binary data", () => {
			const expected = "Hello";
			expect(hex.decode(Buffer.from(expected).toString("hex"))).toBe(expected);
		});

		it("should throw an error for an odd-length string", () => {
			const input = "123";
			expect(() => hex.decode(input)).toThrow(Error);
		});

		it("should throw an error for a non-hexadecimal string", () => {
			const input = "zzzz";
			expect(() => hex.decode(input)).toThrow(Error);
		});
	});

	describe("round-trip tests", () => {
		it("should return the original string after encoding and decoding", () => {
			const input = "Hello, Hex!";
			const encoded = hex.encode(input);
			const decoded = hex.decode(encoded);
			expect(decoded).toBe(input);
		});

		it("should handle empty strings", () => {
			const input = "";
			const encoded = hex.encode(input);
			const decoded = hex.decode(encoded);
			expect(decoded).toBe(input);
		});
	});
});
