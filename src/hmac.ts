import { subtle } from "uncrypto";
import type { SHAFamily, TypedArray } from "./type";

export const hmac = {
	importKey: async (
		algorithm: SHAFamily,
		key: string | ArrayBuffer | TypedArray,
	) => {
		return subtle.importKey(
			"raw",
			typeof key === "string" ? new TextEncoder().encode(key) : key,
			{ name: "HMAC", hash: { name: algorithm } },
			false,
			["sign", "verify"],
		);
	},
	sign: async (
		hmacKey: string | CryptoKey,
		data: string | ArrayBuffer | TypedArray,
		hash: SHAFamily = "SHA-256",
	) => {
		if (typeof hmacKey === "string") {
			hmacKey = await hmac.importKey(hash, hmacKey);
		}
		return subtle.sign(
			"HMAC",
			hmacKey,
			typeof data === "string" ? new TextEncoder().encode(data) : data,
		);
	},
	verify: async (
		hmacKey: CryptoKey | string,
		{
			signature,
			data,
		}: {
			signature: ArrayBuffer | TypedArray | string;
			data: string | ArrayBuffer | TypedArray;
		},
	) => {
		if (typeof hmacKey === "string") {
			hmacKey = await hmac.importKey("SHA-256", hmacKey);
		}
		return subtle.verify(
			"HMAC",
			hmacKey,
			typeof signature === "string"
				? new TextEncoder().encode(signature)
				: signature,
			typeof data === "string" ? new TextEncoder().encode(data) : data,
		);
	},
};
