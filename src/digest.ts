import { base64 } from "./base64";
import type { EncodingFormat, SHAFamily } from "./type";

export async function digest<Encoding extends EncodingFormat = "raw">(
	input: string | ArrayBuffer | ArrayBufferView,
	algorithm: SHAFamily,
	encoding?: Encoding,
): Promise<Encoding extends "hex" ? string : ArrayBuffer> {
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
	return hashBuffer as any;
}
