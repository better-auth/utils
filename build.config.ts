import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
	outDir: "dist",
	declaration: true,
	rollup: {
		emitCJS: true,
	},
	entries: [
		"src/index",
		"src/base32",
		"src/base64",
		"src/binary",
		"src/hash",
		"src/ecdsa",
		"src/hex",
		"src/hmac",
		"src/otp",
		"src/random",
		"src/rsa",
		"src/password",
		{ input: "src/password.node.ts", name: "password.node" },
	],
});
