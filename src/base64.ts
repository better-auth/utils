//inspired by oslo implementation by pilcrowonpaper: https://github.com/pilcrowonpaper/oslo/blob/main/src/encoding/base64.ts
//refactored based on core-js implementation: https://github.com/zloirock/core-js/blob/master/packages/core-js/internals/uint8-from-base64.js

import type { TypedArray } from "./type";

const BASE64_ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_URL_ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function getAlphabet(urlSafe: boolean): string {
	return urlSafe ? BASE64_URL_ALPHABET : BASE64_ALPHABET;
}

function createDecodeMap(alphabet: string): Map<string, number> {
	const map = new Map<string, number>();
	for (let i = 0; i < alphabet.length; i++) {
		map.set(alphabet[i], i);
	}
	return map;
}

const base64DecodeMap = createDecodeMap(BASE64_ALPHABET);
const base64UrlDecodeMap = createDecodeMap(BASE64_URL_ALPHABET);

function skipWhitespace(str: string, index: number): number {
	const length = str.length;
	while (index < length) {
		const char = str[index];
		if (
			char !== " " &&
			char !== "\t" &&
			char !== "\n" &&
			char !== "\f" &&
			char !== "\r"
		) {
			break;
		}
		index++;
	}
	return index;
}

function base64Encode(
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
		while (shift >= 6) {
			shift -= 6;
			result += alphabet[(buffer >> shift) & 0x3f];
		}
	}

	if (shift > 0) {
		result += alphabet[(buffer << (6 - shift)) & 0x3f];
	}

	if (padding) {
		const padCount = (4 - (result.length % 4)) % 4;
		result += "=".repeat(padCount);
	}

	return result;
}

function base64Decode(
	data: string,
	options: { alphabet?: "base64" | "base64url"; strict?: boolean } = {},
): Uint8Array {
	const { alphabet = "base64", strict = false } = options;
	const isUrlSafe = alphabet === "base64url";
	const decodeMap = isUrlSafe ? base64UrlDecodeMap : base64DecodeMap;
	const result: number[] = [];
	let buffer = 0;
	let bitsCollected = 0;
	let index = 0;
	const length = data.length;

	while (index < length) {
		if (!strict) {
			index = skipWhitespace(data, index);
			if (index >= length) break;
		}

		const char = data[index];
		if (char === "=") {
			break;
		}

		const value = decodeMap.get(char);
		if (value === undefined) {
			if (strict) {
				throw new SyntaxError(`Invalid Base64 character: "${char}"`);
			}
			// In non-strict mode, skip invalid characters if they're not whitespace
			if (
				char !== " " &&
				char !== "\t" &&
				char !== "\n" &&
				char !== "\f" &&
				char !== "\r"
			) {
				throw new SyntaxError(`Invalid Base64 character: "${char}"`);
			}
			index++;
			continue;
		}

		buffer = (buffer << 6) | value;
		bitsCollected += 6;

		if (bitsCollected >= 8) {
			bitsCollected -= 8;
			result.push((buffer >> bitsCollected) & 0xff);
		}

		index++;
	}

	// Check for padding validation in strict mode
	if (strict) {
		// Skip any remaining whitespace to check for padding
		while (
			index < length &&
			(data[index] === " " ||
				data[index] === "\t" ||
				data[index] === "\n" ||
				data[index] === "\f" ||
				data[index] === "\r")
		) {
			index++;
		}

		// Check if we have unexpected padding
		if (index < length && data[index] === "=" && bitsCollected > 0) {
			throw new SyntaxError('Unexpected "=" padding character');
		}
	}

	if (strict && bitsCollected >= 6) {
		// Check if the extra bits are all zeros (valid padding)
		const extraBits = buffer & ((1 << bitsCollected) - 1);
		if (extraBits !== 0) {
			throw new SyntaxError("Invalid Base64 string: non-zero padding bits");
		}
	}

	return new Uint8Array(result);
}

export const base64 = {
	encode(
		data: ArrayBuffer | TypedArray | string,
		options: { padding?: boolean } = {},
	) {
		const alphabet = getAlphabet(false);
		const buffer =
			typeof data === "string"
				? new TextEncoder().encode(data)
				: new Uint8Array(
						data instanceof ArrayBuffer
							? data
							: data.buffer.slice(
									data.byteOffset,
									data.byteOffset + data.byteLength,
								),
					);
		return base64Encode(buffer, alphabet, options.padding ?? true);
	},
	decode(
		data: string | ArrayBuffer | TypedArray,
		options: { strict?: boolean } = {},
	) {
		if (typeof data !== "string") {
			data = new TextDecoder().decode(data);
		}
		const urlSafe = data.includes("-") || data.includes("_");
		const alphabet = urlSafe ? "base64url" : "base64";
		return base64Decode(data, { alphabet, strict: options.strict });
	},
};

export const base64Url = {
	encode(
		data: ArrayBuffer | TypedArray | string,
		options: { padding?: boolean } = {},
	) {
		const alphabet = getAlphabet(true);
		const buffer =
			typeof data === "string"
				? new TextEncoder().encode(data)
				: new Uint8Array(
						data instanceof ArrayBuffer
							? data
							: data.buffer.slice(
									data.byteOffset,
									data.byteOffset + data.byteLength,
								),
					);
		return base64Encode(buffer, alphabet, options.padding ?? false);
	},
	decode(
		data: string | ArrayBuffer | TypedArray,
		options: { strict?: boolean } = {},
	) {
		if (typeof data !== "string") {
			data = new TextDecoder().decode(data);
		}
		return base64Decode(data, {
			alphabet: "base64url",
			strict: options.strict,
		});
	},
};
