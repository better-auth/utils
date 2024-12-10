import { subtle } from "uncrypto";
import type { EncodingFormat, SHAFamily, TypedArray } from "./type";
import { hex } from "./hex";
import { base64 } from "./base64";

export const createHMAC = <E extends EncodingFormat = "none">(
	algorithm: SHAFamily = "SHA-256",
	encoding: E = "none" as E,
) => {
	const hmac = {
		importKey: async (
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
		): Promise<E extends "none" ? ArrayBuffer : string> => {
			if (typeof hmacKey === "string") {
				hmacKey = await hmac.importKey(hmacKey);
			}
			const signature = await subtle.sign(
				"HMAC",
				hmacKey,
				typeof data === "string" ? new TextEncoder().encode(data) : data,
			);
			if (encoding === "hex") {
				return hex.encode(signature) as any;
			}
			if (encoding === "base64" || encoding === "base64url" || encoding === "base64urlnopad") {
				return base64.encode(signature, {
					urlSafe: encoding !== "base64",
					padding: encoding !== "base64urlnopad"
				}) as any;
			}
			return signature as any;
		},
		verify: async (
			hmacKey: CryptoKey | string,
			data: string | ArrayBuffer | TypedArray,
			signature: string | ArrayBuffer | TypedArray,
		) => {
			if (typeof hmacKey === "string") {
				hmacKey = await hmac.importKey(hmacKey);
			}
			if (encoding === "hex") {
				signature = hex.decode(signature);
			}
			if (encoding === "base64" || encoding === "base64url" || encoding === "base64urlnopad") {
				signature = await base64.decode(
					typeof signature === "string" ? signature : new TextDecoder().decode(signature),
				);
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
	}
	return hmac
}
