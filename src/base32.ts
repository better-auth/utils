//inspired by oslo implementation by pilcrowonpaper: https://github.com/pilcrowonpaper/oslo/blob/main/src/encoding/base32.ts

import type { TypedArray } from "./type";

/**
 * Returns the Base32 alphabet based on the encoding type.
 * @param hex - Whether to use the hexadecimal Base32 alphabet.
 * @returns The appropriate Base32 alphabet.
 */
function getAlphabet(hex: boolean): string {
	return hex
		? "0123456789ABCDEFGHIJKLMNOPQRSTUV"
		: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
}

/**
 * Creates a decode map for the given alphabet.
 * @param alphabet - The Base32 alphabet.
 * @returns A map of characters to their corresponding values.
 */
function createDecodeMap(alphabet: string): Map<string, number> {
	const decodeMap = new Map<string, number>();
	for (let i = 0; i < alphabet.length; i++) {
		decodeMap.set(alphabet[i]!, i);
	}
	return decodeMap;
}

/**
 * Encodes a Uint8Array into a Base32 string.
 * @param data - The data to encode.
 * @param alphabet - The Base32 alphabet to use.
 * @param padding - Whether to include padding.
 * @returns The Base32 encoded string.
 */
function base32Encode(
	data: Uint8Array,
	alphabet: string,
	padding: boolean,
): string {
	let result = "";
	let buffer = 0;
	let shift = 0;

	for (const byte of data) {
		buffer = (buffer << 8) | byte;
		shift += 8;
		while (shift >= 5) {
			shift -= 5;
			result += alphabet[(buffer >> shift) & 0x1f];
		}
	}

	if (shift > 0) {
		result += alphabet[(buffer << (5 - shift)) & 0x1f];
	}

	if (padding) {
		const padCount = (8 - (result.length % 8)) % 8;
		result += "=".repeat(padCount);
	}

	return result;
}

/**
 * Decodes a Base32 string into a Uint8Array.
 * @param data - The Base32 encoded string.
 * @param alphabet - The Base32 alphabet to use.
 * @returns The decoded Uint8Array.
 */
function base32Decode(data: string, alphabet: string): Uint8Array {
	const decodeMap = createDecodeMap(alphabet);
	const result: number[] = [];
	let buffer = 0;
	let bitsCollected = 0;

	for (const char of data) {
		if (char === "=") break;
		const value = decodeMap.get(char);
		if (value === undefined) {
			throw new Error(`Invalid Base32 character: ${char}`);
		}
		buffer = (buffer << 5) | value;
		bitsCollected += 5;

		while (bitsCollected >= 8) {
			bitsCollected -= 8;
			result.push((buffer >> bitsCollected) & 0xff);
		}
	}

	return Uint8Array.from(result);
}

/**
 * Base32 encoding and decoding utility.
 */
export const base32 = {
	/**
	 * Encodes data into a Base32 string.
	 * @param data - The data to encode (ArrayBuffer, TypedArray, or string).
	 * @param options - Encoding options.
	 * @returns The Base32 encoded string.
	 */
	encode(
		data: ArrayBuffer | TypedArray | string,
		options: { padding?: boolean } = {},
	): string {
		const alphabet = getAlphabet(false);
		const buffer =
			typeof data === "string"
				? new TextEncoder().encode(data)
				: new Uint8Array(data);
		return base32Encode(buffer, alphabet, options.padding ?? true);
	},

	/**
	 * Decodes a Base32 string into a Uint8Array.
	 * @param data - The Base32 encoded string or ArrayBuffer/TypedArray.
	 * @returns The decoded Uint8Array.
	 */
	decode(data: string | ArrayBuffer | TypedArray): Uint8Array {
		if (typeof data !== "string") {
			data = new TextDecoder().decode(data);
		}
		const alphabet = getAlphabet(false);
		return base32Decode(data, alphabet);
	},
};

/**
 * Base32hex encoding and decoding utility.
 */
export const base32hex = {
	/**
	 * Encodes data into a Base32hex string.
	 * @param data - The data to encode (ArrayBuffer, TypedArray, or string).
	 * @param options - Encoding options.
	 * @returns The Base32hex encoded string.
	 */
	encode(
		data: ArrayBuffer | TypedArray | string,
		options: { padding?: boolean } = {},
	): string {
		const alphabet = getAlphabet(true);
		const buffer =
			typeof data === "string"
				? new TextEncoder().encode(data)
				: new Uint8Array(data);
		return base32Encode(buffer, alphabet, options.padding ?? true);
	},

	/**
	 * Decodes a Base32hex string into a Uint8Array.
	 * @param data - The Base32hex encoded string.
	 * @returns The decoded Uint8Array.
	 */
	decode(data: string): Uint8Array {
		const alphabet = getAlphabet(true);
		return base32Decode(data, alphabet);
	},
};
