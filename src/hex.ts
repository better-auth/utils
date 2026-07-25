import { hexToBytes } from "@noble/hashes/utils.js";
import { toUint8Array } from "./bytes";
import type { NumberTypedArray, TypedArray, Uint8Array_ } from "./type";

const toBytes = (data: string): Uint8Array_ => hexToBytes(data) as Uint8Array_;

export const hex = {
	encode: (data: string | ArrayBuffer | NumberTypedArray) => {
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
