import type { EncodingFormat, SHAFamily, TypedArray } from "./type";
import { toBufferSource } from "./bytes";
import { hex } from "./hex";
import { base64, base64Url } from "./base64";
import { getWebcryptoSubtle } from "./index";

export const createHMAC = <E extends EncodingFormat = "none">(
	algorithm: SHAFamily = "SHA-256",
	encoding: E = "none" as E,
) => {
	const hmac = {
		importKey: async (
			key: string | ArrayBuffer | TypedArray,
			keyUsage: "sign" | "verify",
		) => {
			return getWebcryptoSubtle().importKey(
				"raw",
				toBufferSource(key),
				{ name: "HMAC", hash: { name: algorithm } },
				false,
				[keyUsage],
			);
		},
		sign: async (
			hmacKey: string | CryptoKey,
			data: string | ArrayBuffer | TypedArray,
		): Promise<E extends "none" ? ArrayBuffer : string> => {
			if (typeof hmacKey === "string") {
				hmacKey = await hmac.importKey(hmacKey, "sign");
			}
			const signature = await getWebcryptoSubtle().sign(
				"HMAC",
				hmacKey,
				toBufferSource(data),
			);
			if (encoding === "hex") {
				return hex.encode(signature) as E extends "none" ? ArrayBuffer : string;
			}
			if (
				encoding === "base64" ||
				encoding === "base64url" ||
				encoding === "base64urlnopad"
			) {
				return base64Url.encode(signature, {
					padding: encoding !== "base64urlnopad",
				}) as E extends "none" ? ArrayBuffer : string;
			}
			return signature as E extends "none" ? ArrayBuffer : string;
		},
		verify: async (
			hmacKey: CryptoKey | string,
			data: string | ArrayBuffer | TypedArray,
			signature: string | ArrayBuffer | TypedArray,
		) => {
			if (typeof hmacKey === "string") {
				hmacKey = await hmac.importKey(hmacKey, "verify");
			}
			if (encoding === "hex") {
				signature = hex.decode(signature);
			}
			if (
				encoding === "base64" ||
				encoding === "base64url" ||
				encoding === "base64urlnopad"
			) {
				signature = await base64.decode(signature);
			}
			return getWebcryptoSubtle().verify(
				"HMAC",
				hmacKey,
				toBufferSource(signature),
				toBufferSource(data),
			);
		},
	};
	return hmac;
};
