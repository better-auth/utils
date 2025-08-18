export function safeEqual(a: string, b: string): boolean {
	const aBytes = new TextEncoder().encode(a);
	const bBytes = new TextEncoder().encode(b);

	let len = Math.max(aBytes.length, bBytes.length);
	let result = aBytes.length ^ bBytes.length;

	for (let i = 0; i < len; i++) {
		const aByte = i < aBytes.length ? aBytes[i] : 0;
		const bByte = i < bBytes.length ? bBytes[i] : 0;
		result |= aByte ^ bByte;
	}

	return result === 0;
}
