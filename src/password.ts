import { scryptAsync } from "@noble/hashes/scrypt.js";
import { hex } from "./hex";

const config = {
	N: 16384,
	r: 16,
	p: 1,
	dkLen: 64,
};

async function generateKey(password: string, salt: string): Promise<Uint8Array> {
	return scryptAsync(password.normalize("NFKC"), salt, {
		N: config.N,
		r: config.r,
		p: config.p,
		dkLen: config.dkLen,
		maxmem: 128 * config.N * config.r * 2,
	});
}

export async function hashPassword(password: string): Promise<string> {
	const salt = hex.encode(crypto.getRandomValues(new Uint8Array(16)));
	const key = await generateKey(password, salt);
	return `${salt}:${hex.encode(key)}`;
}

export async function verifyPassword(
	hash: string,
	password: string,
): Promise<boolean> {
	const [salt, key] = hash.split(":");
	if (!salt || !key) {
		throw new Error("Invalid password hash");
	}
	const targetKey = await generateKey(password, salt);
	return hex.encode(targetKey) === key;
}
