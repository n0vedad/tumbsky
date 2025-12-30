import { createHmac, timingSafeEqual } from 'node:crypto';

import type { Cookies } from '@sveltejs/kit';

import { env } from '$env/dynamic/private';

import { fromBase64Url, toBase64Url } from '@atcute/multibase';

const SEPARATOR = '.';

const getCookieSecret = (): string => {
	// use a build-time placeholder if COOKIE_SECRET is not set (for Railway builds)
	// at runtime, this will throw an error if not properly configured
	const secret = env.COOKIE_SECRET || 'BUILD_TIME_PLACEHOLDER';

	if (secret === 'BUILD_TIME_PLACEHOLDER' && env.DATABASE_URL) {
		// we're at runtime (DATABASE_URL exists) but COOKIE_SECRET is not set
		throw new Error(`COOKIE_SECRET is not set`);
	}

	return secret;
};

const hmacSha256 = (data: string): Uint8Array => {
	return createHmac('sha256', getCookieSecret()).update(data).digest();
};

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

	if (!timingSafeEqual(got, expected)) {
		return null;
	}

	return value;
};

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
