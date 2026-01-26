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

/**
 * Equivalent to `Uint8Array` before TypeScript 5.7, and `Uint8Array<ArrayBuffer>` in TypeScript 5.7
 * and beyond.
 *
 * **Context**
 *
 * `Uint8Array` became a generic type in TypeScript 5.7, requiring types defined simply as
 * `Uint8Array` to be refactored to `Uint8Array<ArrayBuffer>` starting in Deno 2.2. `Uint8Array` is
 * _not_ generic in Deno 2.1.x and earlier, though, so this type helps bridge this gap.
 *
 * Inspired by Deno's std library:
 *
 * https://github.com/denoland/std/blob/b5a5fe4f96b91c1fe8dba5cc0270092dd11d3287/bytes/_types.ts#L11
 */
export type Uint8Array_ = ReturnType<Uint8Array["slice"]>;

export type SHAFamily = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
export type EncodingFormat =
	| "hex"
	| "base64"
	| "base64url"
	| "base64urlnopad"
	| "none";
export type ECDSACurve = "P-256" | "P-384" | "P-521";
export type ExportKeyFormat = "jwk" | "spki" | "pkcs8" | "raw";
