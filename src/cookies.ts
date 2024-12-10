import { base64 } from "./base64";
import { hmac } from "./hmac";

interface CookieAttributes {
	expires?: Date;
	path?: string;
	domain?: string;
	secure?: boolean;
	sameSite?: "strict" | "lax" | "none";
	maxAge?: number;
	httpOnly?: boolean;
	partitioned?: boolean;
	[key: string]: string | number | boolean | Date | undefined;
}

interface CookieAttributesWithValue extends CookieAttributes {
	value: string;
}

type Cookie = Record<string, string>;

// all ASCII chars 32-126 except 34, 59, and 92 (i.e. space to tilde but not double quote, semicolon, or backslash)
// (see: https://datatracker.ietf.org/doc/html/rfc6265#section-4.1.1)
//
// note: the spec also prohibits comma and space, but we allow both since they are very common in the real world
// (see: https://github.com/golang/go/issues/7243)
const validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
// all alphanumeric chars and all of _!#$%&'*.^`|~+-
// (see: https://datatracker.ietf.org/doc/html/rfc6265#section-4.1.1)
const validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;

export const cookies = {
	parseSetCookies: (setCookieString: string) => {
		const cookies = new Map<string, CookieAttributesWithValue>();
		const cookieArray = setCookieString.split(", ");

		cookieArray.forEach((cookieString) => {
			const parts = cookieString.split(";").map((part) => part.trim());
			const [nameValue, ...attributes] = parts;
			const [name, ...valueParts] = nameValue.split("=");

			const value = valueParts.join("=");

			if (!name || value === undefined) {
				return;
			}

			const attrObj: CookieAttributesWithValue = { value };

			attributes.forEach((attribute) => {
				const [attrName, ...attrValueParts] = attribute.split("=");
				const attrValue = attrValueParts.join("=");

				const normalizedAttrName = attrName.trim().toLowerCase();

				switch (normalizedAttrName) {
					case "max-age":
						attrObj.maxAge = parseInt(attrValue, 10);
						break;
					case "expires":
						attrObj.expires = attrValue
							? new Date(attrValue.trim())
							: undefined;
						break;
					case "domain":
						attrObj.domain = attrValue ? attrValue.trim() : undefined;
						break;
					case "path":
						attrObj.path = attrValue ? attrValue.trim() : undefined;
						break;
					case "secure":
						attrObj.secure = true;
						break;
					case "httponly":
						attrObj.httpOnly = true;
						break;
					case "samesite":
						attrObj.sameSite = attrValue
							? (attrValue.trim().toLowerCase() as "strict" | "lax" | "none")
							: undefined;
						break;
					case "partitioned":
						attrObj.partitioned = true;
						break;
					default:
						attrObj[attrName] = attrValue;
						break;
				}
			});

			cookies.set(name, attrObj);
		});
		return cookies;
	},
	serializeCookie: async (input: {
		name: string;
		value: string;
		attributes?: CookieAttributes;
		signed?: {
			key: string;
		};
	}) => {
		const { name, value, attributes } = input;
		const opt = { ...attributes };
		const signature = input.signed
			? await hmac.sign(input.signed.key, value)
			: undefined;
		const base64Signature = signature
			? await base64.encode(signature, {
					urlSafe: true,
					padding: false,
				})
			: undefined;
		const _value = base64Signature ? `${value}.${base64Signature}` : value;
		let cookie = `${name}=${encodeURIComponent(_value)}`;
		if (name.startsWith("__Secure-") && !attributes?.secure) {
			opt.secure = true;
		}

		if (name.startsWith("__Host-")) {
			// https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-13#section-4.1.3.2
			if (!opt.secure) {
				opt.secure = true;
			}

			if (opt.path !== "/") {
				opt.path = "/";
			}

			if (opt.domain) {
				opt.domain = undefined;
			}
		}

		if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
			if (opt.maxAge > 34560000) {
				// https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-13#section-4.1.2.2
				throw new Error(
					"Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration.",
				);
			}
			cookie += `; Max-Age=${Math.floor(opt.maxAge)} `;
		}

		if (opt.domain && opt.prefix !== "host") {
			cookie += `; Domain=${opt.domain}`;
		}

		if (opt.path) {
			cookie += `; Path=${opt.path}`;
		}

		if (opt.expires) {
			if (opt.expires.getTime() - Date.now() > 34560000_000) {
				// https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-13#section-4.1.2.1
				throw new Error(
					"Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future.",
				);
			}
			cookie += `; Expires = ${opt.expires.toUTCString()}`;
		}

		if (opt.httpOnly) {
			cookie += "; HttpOnly";
		}

		if (opt.secure) {
			cookie += "; Secure";
		}

		if (opt.sameSite) {
			cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
		}

		if (opt.partitioned) {
			if (!opt.secure) {
				throw new Error("Partitioned Cookie must have Secure attributes");
			}
			cookie += "; Partitioned";
		}
		return cookie;
	},
	verifySignedCookie: (input: {
		/**
		 * The cookie string to verify
		 */
		cookie: string;
		/**
		 * The key used to sign the cookie
		 */
		key: string;
	}) => {
		const { cookie, key } = input;
		const [value, signature] = cookie.split(".");
		if (!value || !signature) {
			return false;
		}
		return hmac.verify(key, {
			data: value,
			signature,
		});
	},
	parseCookies: async (
		cookie: string,
		name: string,
		signed?: {
			key: string;
		},
	) => {
		const cookies = new Map<string, string>();
		const pairs = cookie.trim().split(";");
		for (const pair of pairs) {
			const pairStr = pair.trim();
			const valueStartPos = pairStr.indexOf("=");
			if (valueStartPos === -1) {
				continue;
			}
			const cookieName = pairStr.substring(0, valueStartPos).trim();
			if (
				(name && name !== cookieName) ||
				!validCookieNameRegEx.test(cookieName)
			) {
				continue;
			}
			let cookieValue = pairStr.substring(valueStartPos + 1).trim();
			if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
				cookieValue = cookieValue.slice(1, -1);
			}
			if (validCookieValueRegEx.test(cookieValue)) {
				cookies.set(cookieName, decodeURIComponent(cookieValue));
			}

			if (signed && cookieName === name) {
				const [value, signature] = cookieValue.split(".");
				const isValid = await hmac.verify(signed.key, {
					data: value,
					signature,
				});
				if (isValid) {
					cookies.set(cookieName, decodeURIComponent(value));
				} else {
					cookies.delete(cookieName);
				}
			}
		}
		return cookies;
	},
	getCookie: async (
		cookie: string,
		name: string,
		signed?: {
			key: string;
		},
	) => {
		const parsedCookies = await cookies.parseCookies(cookie, name, signed);
		if (!parsedCookies) {
			return undefined;
		}
		return parsedCookies.get(name);
	},
};
