export type TypedArray =
	| Uint8Array
	| Int8Array
	| Uint16Array
	| Int16Array
	| Uint32Array
	| Int32Array
	| Float32Array
	| Float64Array
	| BigInt64Array
	| BigUint64Array;

export type SHAFamily = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
export type EncodingFormat =
	| "hex"
	| "base64"
	| "base64url"
	| "base64urlnopad"
	| "none";
export type ECDSACurve = "P-256" | "P-384" | "P-521";
export type ExportKeyFormat = "jwk" | "spki" | "pkcs8" | "raw";
