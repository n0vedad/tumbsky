/**
 * authentication context and session validation
 *
 * provides requireAuth() to enforce authenticated sessions across routes.
 * uses signed cookies to prevent tampering and caches OAuth clients per request.
 */
import { error } from '@sveltejs/kit';

import { Client } from '@atcute/client';
import type { Did } from '@atcute/lexicons';
import { isDid } from '@atcute/lexicons/syntax';
import {
	AuthMethodUnsatisfiableError,
	TokenInvalidError,
	TokenRefreshError,
	TokenRevokedError,
} from '@atcute/oauth-node-client';

import { getRequestEvent } from '$app/server';

import { getSignedCookie } from '$lib/server/auth/signed-cookie';
import { getOAuth } from '$lib/server/oauth';

export const SESSION_COOKIE = 'tumbsky_session';

export interface Session {
	did: Did;
}

export interface AuthContext {
	session: Session;
	client: Client;
}

/**
 * checks if error indicates OAuth session is no longer valid
 *
 * detects token refresh failures, revoked tokens, and auth method changes
 * that require re-authentication.
 */
const isSessionInvalidError = (err: unknown): boolean => {
	return (
		err instanceof TokenRefreshError ||
		err instanceof TokenInvalidError ||
		err instanceof TokenRevokedError ||
		err instanceof AuthMethodUnsatisfiableError
	);
};

/**
 * requires an authenticated session, throwing if not signed in or session is invalid
 *
 * validates signed cookie, restores OAuth session, and creates authenticated client.
 * caches result in event.locals.auth to avoid redundant OAuth calls within same request.
 * deletes session cookie if OAuth session is expired/revoked to trigger re-login.
 *
 * @returns authenticated session with DID and ATProto client
 * @throws 401 if not signed in or session expired
 * @throws 503 if OAuth not configured (requires HTTPS URL)
 */
export const requireAuth = async (): Promise<AuthContext> => {
	const { locals, cookies } = getRequestEvent();

	// return cached result if available (avoids redundant OAuth calls)
	if (locals.auth) {
		return locals.auth;
	}

	const did = getSignedCookie(cookies, SESSION_COOKIE);
	if (!did) {
		error(401, `not signed in`);
	}

	if (!isDid(did)) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		error(401, `not signed in`);
	}

	const oauth = await getOAuth();
	if (!oauth) {
		error(503, `OAuth not configured - requires https URL`);
	}

	try {
		// restore OAuth session and create authenticated client
		const session = await oauth.restore(did);
		const client = new Client({ handler: session });

		const auth: AuthContext = {
			session: { did },
			client,
		};

		locals.auth = auth;
		return auth;
	} catch (err) {
		// delete cookie on session errors to force re-authentication
		if (isSessionInvalidError(err)) {
			cookies.delete(SESSION_COOKIE, { path: '/' });

			error(401, `session expired`);
		}

		throw err;
	}
};
