import type { TypedArray } from "./type";

function createDecodeMap(alphabet: string): Map<string, number> {
	const decodeMap = new Map<string, number>();
	for (let i = 0; i < alphabet.length; i++) {
		decodeMap.set(alphabet[i]!, i);
	}
	return decodeMap;
}

function getAlphabet(urlSafe: boolean): string {
	return urlSafe
		? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
		: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
}

function base64Encode(
	data: Uint8Array,
	alphabet: string,
	padding: boolean,
): string {
	let result = "";
	let buffer = 0;
	let shift = 0;

	for (let i = 0; i < data.length; i++) {
		buffer = (buffer << 8) | data[i]!;
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

function base64Decode(data: string, alphabet: string): Uint8Array {
	const decodeMap = createDecodeMap(alphabet);
	const result: number[] = [];
	const chunkCount = Math.ceil(data.length / 4);

	for (let i = 0; i < chunkCount; i++) {
		let padCount = 0;
		let buffer = 0;
		for (let j = 0; j < 4; j++) {
			const encoded = data[i * 4 + j];
			if (encoded === "=") {
				padCount += 1;
				continue;
			}
			if (encoded === undefined) {
				padCount += 1;
				continue;
			}
			const value = decodeMap.get(encoded) ?? null;
			if (value === null) {
				throw new Error(`Invalid character: ${encoded}`);
			}
			buffer += value << (6 * (3 - j));
		}
		result.push((buffer >> 16) & 0xff);
		if (padCount < 2) {
			result.push((buffer >> 8) & 0xff);
		}
		if (padCount < 1) {
			result.push(buffer & 0xff);
		}
	}
	return Uint8Array.from(result);
}

export const base64 = {
	async encode(
		data: ArrayBuffer | TypedArray | string,
		options: {
			urlSafe?: boolean;
			padding?: boolean;
		} = {},
	) {
		const alphabet = getAlphabet(options.urlSafe ?? false);
		if (typeof data === "string") {
			const encoder = new TextEncoder();
			data = encoder.encode(data);
		}
		return base64Encode(
			new Uint8Array(data),
			alphabet,
			options.padding ?? true,
		);
	},
	async decode(data: string) {
		const isUrlSafe = data.includes("-") || data.includes("_");
		const alphabet = getAlphabet(isUrlSafe);
		const decoded = base64Decode(data, alphabet);
		return new TextDecoder().decode(decoded);
	},
};
