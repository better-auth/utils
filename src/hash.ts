import { base64 } from "./base64";
import type { EncodingFormat, SHAFamily, TypedArray } from "./type";

export function createHash<Encoding extends EncodingFormat = "none">(
	algorithm: SHAFamily,
	encoding?: Encoding,
) {
	return {
		digest: async (input: string | ArrayBuffer | TypedArray,): Promise<Encoding extends "none" ? ArrayBuffer : string> => {
			const encoder = new TextEncoder();
			const data = typeof input === "string" ? encoder.encode(input) : input;
			const hashBuffer = await crypto.subtle.digest(algorithm, data);

			if (encoding === "hex") {
				const hashArray = Array.from(new Uint8Array(hashBuffer));
				const hashHex = hashArray
					.map((b) => b.toString(16).padStart(2, "0"))
					.join("");
				return hashHex as any;
			}

			if (encoding === "base64" || encoding === "base64url" || encoding === "base64urlnopad") {
				const hashBase64 = base64.encode(hashBuffer, {
					urlSafe: encoding !== "base64",
					padding: encoding !== "base64urlnopad",
				});
				return hashBase64 as any;
			}
			return hashBuffer as any;
		}
	}
}