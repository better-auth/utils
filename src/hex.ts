import { hexToBytes } from "@noble/hashes/utils.js";
import type { TypedArray, Uint8Array_ } from "./type";
import { toUint8Array } from "./bytes";

const toBytes = (data: string): Uint8Array_ => hexToBytes(data) as Uint8Array_;

export const hex = {
	encode: (data: string | ArrayBuffer | TypedArray) => {
		const buffer = toUint8Array(data);
		if (buffer.byteLength === 0) {
			return "";
		}
		let result = "";
		for (const byte of buffer) {
			result += byte.toString(16).padStart(2, "0");
		}
		return result;
	},
	decode: (data: string | ArrayBuffer | TypedArray) => {
		if (!data) {
			return "";
		}
		if (typeof data === "string") {
			return new TextDecoder().decode(toBytes(data));
		}
		return new TextDecoder().decode(data);
	},
	toBytes,
};
