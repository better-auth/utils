import type { TypedArray, Uint8Array_ } from "./type";

export function toBufferSource(
	data: string | ArrayBuffer | ArrayBufferView,
): BufferSource {
	if (typeof data === "string") {
		return new TextEncoder().encode(data);
	}
	if (!ArrayBuffer.isView(data)) {
		return data;
	}
	if (data.buffer instanceof ArrayBuffer) {
		return data as ArrayBufferView<ArrayBuffer>;
	}
	return new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice();
}

export function toUint8Array(
	data: string | ArrayBuffer | TypedArray,
): Uint8Array_ {
	if (typeof data === "string") {
		return new TextEncoder().encode(data);
	}
	return new Uint8Array(data as ArrayBuffer | ArrayLike<number>);
}
