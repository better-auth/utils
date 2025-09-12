import { getWebcryptoSubtle } from "./index";

type ExportFormat = "jwk" | "spki" | "pkcs8";

export const rsa = {
	generateKeyPair: async (
		modulusLength: 2048 | 4096 = 2048,
		hash: "SHA-256" | "SHA-384" | "SHA-512" = "SHA-256",
	) => {
		return await getWebcryptoSubtle().generateKey(
			{
				name: "RSA-OAEP",
				modulusLength,
				publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
				hash: { name: hash },
			},
			true,
			["encrypt", "decrypt"],
		);
	},
	exportKey: async <E extends ExportFormat>(
		key: CryptoKey,
		format: E,
	): Promise<E extends "jwk" ? JsonWebKey : ArrayBuffer> => {
		return (await getWebcryptoSubtle().exportKey(format, key)) as any;
	},
	importKey: async (
		key: JsonWebKey,
		usage: "encrypt" | "decrypt" = "encrypt",
		hash: "SHA-256" | "SHA-384" | "SHA-512" = "SHA-256",
	) => {
		return await getWebcryptoSubtle().importKey(
			"jwk",
			key,
			{
				name: "RSA-OAEP",
				hash: { name: hash },
			},
			true,
			[usage],
		);
	},
	encrypt: async (
		key: CryptoKey,
		data: string | ArrayBuffer | ArrayBufferView,
	) => {
		const encodedData =
			typeof data === "string" ? new TextEncoder().encode(data) : data;
		return await getWebcryptoSubtle().encrypt(
			{ name: "RSA-OAEP" },
			key,
			encodedData,
		);
	},
	decrypt: async (key: CryptoKey, data: ArrayBuffer | ArrayBufferView) => {
		return await getWebcryptoSubtle().decrypt({ name: "RSA-OAEP" }, key, data);
	},
	sign: async (
		key: CryptoKey,
		data: string | ArrayBuffer | ArrayBufferView,
		saltLength = 32,
	) => {
		const encodedData =
			typeof data === "string" ? new TextEncoder().encode(data) : data;
		return await getWebcryptoSubtle().sign(
			{
				name: "RSA-PSS",
				saltLength,
			},
			key,
			encodedData,
		);
	},
	verify: async (
		key: CryptoKey,
		{
			signature,
			data,
			saltLength = 32,
		}: {
			signature: ArrayBuffer | ArrayBufferView | string;
			data: string | ArrayBuffer | ArrayBufferView | string;
			saltLength?: number;
		},
	) => {
		if (typeof signature === "string") {
			signature = new TextEncoder().encode(signature);
		}
		const encodedData =
			typeof data === "string" ? new TextEncoder().encode(data) : data;
		return await getWebcryptoSubtle().verify(
			{
				name: "RSA-PSS",
				saltLength,
			},
			key,
			signature,
			encodedData,
		);
	},
};
