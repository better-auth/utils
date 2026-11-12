import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "happy-dom",
		// The cross-realm ArrayBuffer test needs an iframe window.
		environmentOptions: {
			happyDOM: { settings: { enableIframePageLoading: true } },
		},
	},
});
