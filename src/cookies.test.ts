import { describe, it, expect, vi } from "vitest";
import { cookies } from "./cookies";
import { hmac } from "./hmac";
import { base64 } from "./base64";

vi.mock("./hmac", async () => {
	return {
		hmac: {
			verify: vi.fn((_, { signature }) => signature === "signature"),
			sign: vi.fn().mockReturnValue("signature"),
		},
	};
});

describe("cookies", () => {
	describe("parseSetCookies", () => {
		it("parses Set-Cookie strings correctly", () => {
			const setCookieString = "test=123; Path=/; Secure, another=456; HttpOnly";
			const parsed = cookies.parseSetCookies(setCookieString);

			expect(parsed.size).toBe(2);
			expect(parsed.get("test")).toMatchObject({
				value: "123",
				path: "/",
				secure: true,
			});
			expect(parsed.get("another")).toMatchObject({
				value: "456",
				httpOnly: true,
			});
		});
	});

	describe("serializeCookie", () => {
		it("serializes cookies correctly", async () => {
			const serialized = await cookies.serializeCookie({
				name: "test",
				value: "123",
				attributes: {
					path: "/",
					secure: true,
					httpOnly: true,
					sameSite: "strict",
				},
			});
			expect(serialized).toContain("test=123");
			expect(serialized).toContain("; Path=/");
			expect(serialized).toContain("; Secure");
			expect(serialized).toContain("; HttpOnly");
			expect(serialized).toContain("; SameSite=Strict");
		});

		it("adds signature if signed", async () => {
			const serialized = await cookies.serializeCookie({
				name: "test",
				value: "123",
				signed: { key: "secret" },
			});

			const signatureBase64 = await base64.encode("signature", {
				padding: false,
				urlSafe: true,
			});
			expect(serialized).toContain(`test=123.${signatureBase64}`);
		});

		it("throws error for invalid Max-Age", async () => {
			await expect(() =>
				cookies.serializeCookie({
					name: "test",
					value: "123",
					attributes: { maxAge: 40000000 },
				}),
			).rejects.toThrow("Cookies Max-Age SHOULD NOT be greater than 400 days");
		});
	});

	describe("verifySignedCookie", () => {
		it("verifies signed cookies correctly", async () => {
			const result = await cookies.verifySignedCookie({
				cookie: "123.signature",
				key: "secret",
			});
			expect(result).toBe(true);
			expect(hmac.verify).toHaveBeenCalledWith("secret", {
				data: "123",
				signature: "signature",
			});
		});

		it("returns false for invalid signatures", async () => {
			const result = await cookies.verifySignedCookie({
				cookie: "123.invalidsignature",
				key: "secret",
			});

			expect(result).toBe(false);
		});
	});

	describe("parseCookies", () => {
		it("parses cookie strings correctly", async () => {
			const cookieString = "test=123; another=456";
			const parsed = await cookies.parseCookies(cookieString, "");

			expect(parsed.get("test")).toBe("123");
			expect(parsed.get("another")).toBe("456");
		});

		it("validates and parses signed cookies", async () => {
			const cookieString = "test=123.signature; another=456";
			const parsed = await cookies.parseCookies(cookieString, "test", {
				key: "secret",
			});
			expect(parsed.get("test")).toBe("123");
			expect(hmac.verify).toHaveBeenCalledWith("secret", {
				data: "123",
				signature: "signature",
			});
		});
	});

	describe("getCookie", () => {
		it("retrieves a specific cookie", async () => {
			const cookieString = "test=123; another=456";
			const result = await cookies.getCookie(cookieString, "test");
			expect(result).toBe("123");
		});

		it("retrieves and validates a signed cookie", async () => {
			const cookieString = "test=123.signature";
			const result = await cookies.getCookie(cookieString, "test", {
				key: "secret",
			});

			expect(result).toBe("123");
		});

		it("returns undefined for an invalid signature", async () => {
			const cookieString = "test=123.invalidsignature";
			const result = await cookies.getCookie(cookieString, "test", {
				key: "secret",
			});
			expect(result).toBeUndefined();
		});
	});
});
