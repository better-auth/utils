import type {
	ECDSACurve,
	ExportKeyFormat,
	SHAFamily,
	TypedArray,
} from "./type";

export const ecdsa = {
	generateKeyPair: async (curve: ECDSACurve = "P-256") => {
		const keyPair = await crypto.subtle.generateKey(
			{
				name: "ECDSA",
				namedCurve: curve,
			},
			true,
			["sign", "verify"],
		);
		const privateKey = await crypto.subtle.exportKey(
			"pkcs8",
			keyPair.privateKey,
		);
		const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
		return { privateKey, publicKey };
	},
	importPrivateKey: async (
		privateKey: ArrayBuffer | TypedArray | string,
		curve: ECDSACurve,
		extractable = false,
	): Promise<CryptoKey> => {
		if (typeof privateKey === "string") {
			privateKey = new TextEncoder().encode(privateKey);
		}
		return await crypto.subtle.importKey(
			"pkcs8",
			privateKey,
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
		if (typeof publicKey === "string") {
			publicKey = new TextEncoder().encode(publicKey);
		}
		return await crypto.subtle.importKey(
			"spki",
			publicKey,
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
		if (typeof data === "string") {
			data = new TextEncoder().encode(data);
		}
		const signature = await crypto.subtle.sign(
			{
				name: "ECDSA",
				hash: { name: hash },
			},
			privateKey,
			data,
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
		if (typeof signature === "string") {
			signature = new TextEncoder().encode(signature);
		}
		if (typeof data === "string") {
			data = new TextEncoder().encode(data);
		}
		return await crypto.subtle.verify(
			{
				name: "ECDSA",
				hash: { name: hash },
			},
			publicKey,
			signature,
			data,
		);
	},
	exportKey: async <E extends ExportKeyFormat>(
		key: CryptoKey,
		format: E,
	): Promise<E extends "jwk" ? JsonWebKey : ArrayBuffer> => {
		return (await crypto.subtle.exportKey(format, key)) as any;
	},
};
