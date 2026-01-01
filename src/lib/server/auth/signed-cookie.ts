/**
 * HMAC-signed cookies for session integrity
 *
 * prevents cookie tampering by appending HMAC-SHA256 signatures.
 * uses timing-safe comparison to prevent timing attacks on signature validation.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

import type { Cookies } from '@sveltejs/kit';

import { env } from '$env/dynamic/private';

import { fromBase64Url, toBase64Url } from '@atcute/multibase';

const SEPARATOR = '.';

/**
 * retrieves COOKIE_SECRET from environment with Railway build-time handling
 *
 * allows Railway to build without COOKIE_SECRET set, but throws at runtime
 * if the secret is still missing. this prevents build failures while ensuring
 * production security.
 *
 * @returns cookie signing secret
 * @throws if COOKIE_SECRET not set at runtime
 */
const getCookieSecret = (): string => {
	const secret = env.COOKIE_SECRET || 'BUILD_TIME_PLACEHOLDER';

	// detect runtime (DATABASE_URL exists) with missing secret
	if (secret === 'BUILD_TIME_PLACEHOLDER' && env.DATABASE_URL) {
		throw new Error(`COOKIE_SECRET is not set`);
	}

	return secret;
};

/**
 * computes HMAC-SHA256 signature for cookie value
 *
 * uses COOKIE_SECRET as signing key to ensure signature can only be
 * created by the server.
 */
const hmacSha256 = (data: string): Uint8Array => {
	return createHmac('sha256', getCookieSecret()).update(data).digest();
};

/**
 * verifies and extracts value from signed cookie
 *
 * uses timing-safe comparison to prevent timing attacks when validating HMAC signatures.
 * returns null if signature is invalid or cookie doesn't exist.
 *
 * @param cookies cookie store from request
 * @param name cookie name
 * @returns extracted value or null if invalid
 */
export const getSignedCookie = (cookies: Cookies, name: string): string | null => {
	const signed = cookies.get(name);
	if (!signed) {
		return null;
	}

	const idx = signed.lastIndexOf(SEPARATOR);
	if (idx === -1) {
		return null;
	}

	const value = signed.slice(0, idx);
	const sig = signed.slice(idx + 1);

	let expected: Uint8Array;
	let got: Uint8Array;
	try {
		expected = hmacSha256(value);
		got = fromBase64Url(sig);
	} catch {
		return null;
	}

	// timing-safe comparison prevents timing attacks
	if (!timingSafeEqual(got, expected)) {
		return null;
	}

	return value;
};

/**
 * sets cookie with HMAC-SHA256 signature
 *
 * appends base64url-encoded signature to prevent tampering. format: value.signature
 *
 * @param cookies cookie store from request
 * @param name cookie name
 * @param value cookie value to sign
 * @param options cookie options (httpOnly, secure, etc.)
 */
export const setSignedCookie = (
	cookies: Cookies,
	name: string,
	value: string,
	options: Parameters<Cookies['set']>[2],
): void => {
	const sig = toBase64Url(hmacSha256(value));
	const signed = `${value}${SEPARATOR}${sig}`;

	cookies.set(name, signed, options);
};
