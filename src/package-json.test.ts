import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type PackageJSON = {
	exports: {
		"./password": {
			workerd: {
				import: string;
				require: string;
			};
		};
	};
};

describe("package exports", () => {
	it("routes workerd password imports to the node-compatible implementation", () => {
		const pkg = JSON.parse(
			readFileSync(join(process.cwd(), "package.json"), "utf8"),
		) as PackageJSON;

		expect(pkg.exports["./password"].workerd).toEqual({
			import: "./dist/password.node.mjs",
			require: "./dist/password.node.cjs",
		});
	});
});
