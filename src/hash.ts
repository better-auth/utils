import { base64, base64Url } from "./base64";
import { toBufferSource } from "./bytes";
import type { EncodingFormat, SHAFamily, TypedArray } from "./type";
import { getWebcryptoSubtle } from "./index";

export function createHash<Encoding extends EncodingFormat = "none">(
	algorithm: SHAFamily,
	encoding?: Encoding,
) {
	return {
		digest: async (
			input: string | ArrayBuffer | TypedArray,
		): Promise<Encoding extends "none" ? ArrayBuffer : string> => {
			const data = toBufferSource(input);
			const hashBuffer = await getWebcryptoSubtle().digest(algorithm, data);

			if (encoding === "hex") {
				const hashArray = Array.from(new Uint8Array(hashBuffer));
				const hashHex = hashArray
					.map((b) => b.toString(16).padStart(2, "0"))
					.join("");
				return hashHex as Encoding extends "none" ? ArrayBuffer : string;
			}

			if (
				encoding === "base64" ||
				encoding === "base64url" ||
				encoding === "base64urlnopad"
			) {
				if (encoding.includes("url")) {
					return base64Url.encode(hashBuffer, {
						padding: encoding !== "base64urlnopad",
					}) as Encoding extends "none" ? ArrayBuffer : string;
				}
				const hashBase64 = base64.encode(hashBuffer);
				return hashBase64 as Encoding extends "none" ? ArrayBuffer : string;
			}
			return hashBuffer as Encoding extends "none" ? ArrayBuffer : string;
		},
	};
}
