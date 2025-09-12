export function getWebcryptoSubtle(): SubtleCrypto {
	const cr = typeof globalThis !== "undefined" && (globalThis as any).crypto;
	if (cr && typeof cr.subtle === "object" && cr.subtle != null)
		return cr.subtle;
	throw new Error("crypto.subtle must be defined");
}
