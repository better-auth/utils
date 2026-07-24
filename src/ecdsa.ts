import type {
	ECDSACurve,
	ExportKeyFormat,
	SHAFamily,
	TypedArray,
} from "./type";
import { toBufferSource } from "./bytes";
import { getWebcryptoSubtle } from "./index";

export const ecdsa = {
	generateKeyPair: async (curve: ECDSACurve = "P-256") => {
		const subtle = getWebcryptoSubtle();
		const keyPair = await subtle.generateKey(
			{
				name: "ECDSA",
				namedCurve: curve,
			},
			true,
			["sign", "verify"],
		);
		const privateKey = await subtle.exportKey("pkcs8", keyPair.privateKey);
		const publicKey = await subtle.exportKey("spki", keyPair.publicKey);
		return { privateKey, publicKey };
	},
	importPrivateKey: async (
		privateKey: ArrayBuffer | TypedArray | string,
		curve: ECDSACurve,
		extractable = false,
	): Promise<CryptoKey> => {
		return await getWebcryptoSubtle().importKey(
			"pkcs8",
			toBufferSource(privateKey),
			{
				name: "ECDSA",
				namedCurve: curve,
			},
			extractable,
			["sign"],
		);
	},
	importPublicKey: async (
		publicKey: ArrayBuffer | TypedArray | string,
		curve: ECDSACurve,
		extractable = false,
	): Promise<CryptoKey> => {
		return await getWebcryptoSubtle().importKey(
			"spki",
			toBufferSource(publicKey),
			{
				name: "ECDSA",
				namedCurve: curve,
			},
			extractable,
			["verify"],
		);
	},
	sign: async (
		privateKey: CryptoKey,
		data: ArrayBuffer | TypedArray | string,
		hash: SHAFamily = "SHA-256",
	): Promise<ArrayBuffer> => {
		const signature = await getWebcryptoSubtle().sign(
			{
				name: "ECDSA",
				hash: { name: hash },
			},
			privateKey,
			toBufferSource(data),
		);
		return signature;
	},

	verify: async (
		publicKey: CryptoKey,
		{
			signature,
			data,
			hash = "SHA-256",
		}: {
			signature: ArrayBuffer | TypedArray | string;
			data: ArrayBuffer | string;
			hash?: SHAFamily;
		},
	): Promise<boolean> => {
		return await getWebcryptoSubtle().verify(
			{
				name: "ECDSA",
				hash: { name: hash },
			},
			publicKey,
			toBufferSource(signature),
			toBufferSource(data),
		);
	},
	exportKey: async <E extends ExportKeyFormat>(
		key: CryptoKey,
		format: E,
	): Promise<E extends "jwk" ? JsonWebKey : ArrayBuffer> => {
		return (await getWebcryptoSubtle().exportKey(
			format,
			key,
		)) as E extends "jwk" ? JsonWebKey : ArrayBuffer;
	},
};
