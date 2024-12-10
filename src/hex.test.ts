import { describe, it, expect } from 'vitest';
import { hex } from './hex';

describe('hex', () => {
    describe('encode', () => {
        it('should encode a string to hexadecimal', () => {
            const input = "Hello, World!";
            const expected = "48656c6c6f2c20576f726c6421";
            expect(hex.encode(input)).toBe(expected);
        });

        it('should encode an ArrayBuffer to hexadecimal', () => {
            const input = new TextEncoder().encode("Hello").buffer;
            const expected = "48656c6c6f";
            expect(hex.encode(input)).toBe(expected);
        });

        it('should encode a TypedArray to hexadecimal', () => {
            const input = new Uint8Array([72, 101, 108, 108, 111]);
            const expected = "48656c6c6f";
            expect(hex.encode(input)).toBe(expected);
        });
    });

    describe('decode', () => {
        it('should decode a hexadecimal string to its original value', () => {
            const input = "48656c6c6f2c20576f726c6421";
            const expected = "Hello, World!";
            expect(hex.decode(input)).toBe(expected);
        });

        it('should handle decoding of a hexadecimal string to binary data', () => {
            const input = "48656c6c6f";
            const expected = "Hello";
            expect(hex.decode(input)).toBe(expected);
        });

        it('should throw an error for an odd-length string', () => {
            const input = "123";
            expect(() => hex.decode(input)).toThrow(Error);
        });

        it('should throw an error for a non-hexadecimal string', () => {
            const input = "zzzz";
            expect(() => hex.decode(input)).toThrow(Error);
        });
    });

    describe('round-trip tests', () => {
        it('should return the original string after encoding and decoding', () => {
            const input = "Hello, Hex!";
            const encoded = hex.encode(input);
            const decoded = hex.decode(encoded);
            expect(decoded).toBe(input);
        });

        it('should handle empty strings', () => {
            const input = "";
            const encoded = hex.encode(input);
            const decoded = hex.decode(encoded);
            expect(decoded).toBe(input);
        });
    });
});
