/**
 * OAuth callback endpoint
 *
 * handles OAuth authorization callback from user's PDS.
 * exchanges authorization code for tokens, fetches user profile, and sets session cookie.
 */
import { redirect } from '@sveltejs/kit';

import { ComAtprotoRepoDescribeRepo } from '@atcute/atproto';
import { ok, Client } from '@atcute/client';

import { error } from '@sveltejs/kit';

import { SESSION_COOKIE } from '$lib/server/auth';
import { setSignedCookie } from '$lib/server/auth/signed-cookie';
import { getOAuth } from '$lib/server/oauth';
import { upsertUser } from '$lib/server/users';

/**
 * processes OAuth callback
 *
 * 1. exchanges authorization code for access/refresh tokens via PKCE
 * 2. fetches user profile to get current handle
 * 3. creates/updates user in database
 * 4. sets signed session cookie (30-day expiry)
 * 5. redirects to home page
 *
 * @throws 503 if OAuth not configured
 * @redirects to / on success
 */
export const GET = async ({ url, cookies }) => {
	const oauth = await getOAuth();
	if (!oauth) {
		error(503, `OAuth not configured - requires https URL`);
	}

	// verify state and exchange code for tokens
	const { session } = await oauth.callback(url.searchParams);

	const client = new Client({ handler: session });

	// fetch user profile to get handle (can change over time)
	const profile = await ok(
		client.call(ComAtprotoRepoDescribeRepo, {
			params: {
				repo: session.did,
			},
		}),
	);

	// register user or update handle if changed
	await upsertUser(session.did, profile.handle);

	const secure = url.protocol === 'https:';

	// set HTTP-only session cookie with HMAC signature
	setSignedCookie(cookies, SESSION_COOKIE, session.did, {
		httpOnly: true,
		secure: secure,
		sameSite: 'lax' as const,
		path: '/',
		maxAge: 60 * 60 * 24 * 30, // 30 days
	});

	redirect(303, '/');
};
