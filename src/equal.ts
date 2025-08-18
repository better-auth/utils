export function safeEqualFallback(a: string, b: string): boolean {
	if (a.length !== b.length) return false;

	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

export async function safeEqual(a: string, b: string): Promise<boolean> {
	try {
		const crypto = await import("crypto");

		if (crypto.timingSafeEqual) {
			const bufA = Buffer.from(a, "utf8");
			const bufB = Buffer.from(b, "utf8");

			if (bufA.length !== bufB.length) return false;

			return crypto.timingSafeEqual(bufA, bufB);
		}
	} catch {}

	return safeEqualFallback(a, b);
}
