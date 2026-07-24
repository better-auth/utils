import { defineConfig } from "tsdown";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		base32: "src/base32.ts",
		base64: "src/base64.ts",
		binary: "src/binary.ts",
		hash: "src/hash.ts",
		ecdsa: "src/ecdsa.ts",
		hex: "src/hex.ts",
		hmac: "src/hmac.ts",
		otp: "src/otp.ts",
		random: "src/random.ts",
		rsa: "src/rsa.ts",
		password: "src/password.ts",
		"password.node": "src/password.node.ts",
	},
	dts: true,
	format: ["esm", "cjs"],
	unbundle: true,
	target: "es2020",
});
