export function safeEqual(a: string, b: string): boolean {
	const aBytes = new TextEncoder().encode(a);
	const bBytes = new TextEncoder().encode(b);

	let len = Math.max(aBytes.length, bBytes.length);
	let result = BigInt(aBytes.length ^ bBytes.length);

	for (let i = 0; i < len; i++) {
		const aByte = i < aBytes.length ? BigInt(aBytes[i]) : 0n;
		const bByte = i < bBytes.length ? BigInt(bBytes[i]) : 0n;
		result |= aByte ^ bByte;
	}

	return result === 0n;
}
