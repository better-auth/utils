import { defineConfig } from "bumpp";

export const releaseConfig = {
	branch: "main",
	npmTag: "latest",
} as const;

export default defineConfig({
	commit: "chore: release {tag}",
	pr: {
		base: releaseConfig.branch,
		branch: "release/v{version}",
		title: "chore: release {tag}",
	},
});
