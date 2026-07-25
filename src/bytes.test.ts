import { describe, expect, it } from "vitest";
import { toBufferSource, toUint8Array } from "./bytes";

describe("bytes", () => {
	describe("toBufferSource", () => {
		it("reuses ArrayBuffer-backed views", () => {
			const input = new Uint8Array([1, 2, 3]).subarray(1);

			expect(toBufferSource(input)).toBe(input);
		});

		it("reuses ArrayBuffer-backed BigInt views", () => {
			const input = new BigUint64Array([1n]);

			expect(toBufferSource(input)).toBe(input);
		});

		it("copies SharedArrayBuffer-backed views", () => {
			const buffer = new SharedArrayBuffer(4);
			const input = new Uint8Array(buffer, 1, 2);
			input.set([2, 3]);

			const result = toBufferSource(input);

			expect(result).toBeInstanceOf(Uint8Array);
			expect(ArrayBuffer.isView(result)).toBe(true);
			if (!ArrayBuffer.isView(result)) {
				throw new TypeError("Expected an ArrayBufferView");
			}
			expect(result.buffer).toBeInstanceOf(ArrayBuffer);
			expect(Array.from(new Uint8Array(result.buffer))).toEqual([2, 3]);
		});

		it("accepts ArrayBuffers from another realm", () => {
			const iframe = document.createElement("iframe");
			document.body.append(iframe);

			try {
				const otherRealm = iframe.contentWindow as unknown as typeof globalThis;
				const input = new otherRealm.ArrayBuffer(4);

				expect(input).not.toBeInstanceOf(ArrayBuffer);
				expect(toBufferSource(input)).toBe(input);
			} finally {
				iframe.remove();
			}
		});
	});

	describe("toUint8Array", () => {
		it("accepts clamped typed arrays", () => {
			const input = new Uint8ClampedArray([0, 255]);

			expect(Array.from(toUint8Array(input))).toEqual([0, 255]);
		});

		it("preserves element conversion for multi-byte typed arrays", () => {
			const input = new Uint16Array([256, 1]);

			expect(Array.from(toUint8Array(input))).toEqual([0, 1]);
		});

		it("rejects BigInt typed arrays", () => {
			// @ts-expect-error BigInt typed arrays do not contain number elements.
			expect(() => toUint8Array(new BigUint64Array([1n]))).toThrow(TypeError);
		});
	});
});
