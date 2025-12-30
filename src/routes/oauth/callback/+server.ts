import { redirect } from '@sveltejs/kit';

import { ComAtprotoRepoDescribeRepo } from '@atcute/atproto';
import { ok, Client } from '@atcute/client';

import { error } from '@sveltejs/kit';

import { SESSION_COOKIE } from '$lib/server/auth';
import { setSignedCookie } from '$lib/server/auth/signed-cookie';
import { getOAuth } from '$lib/server/oauth';
import { upsertUser } from '$lib/server/users';

export const GET = async ({ url, cookies }) => {
	const oauth = await getOAuth();
	if (!oauth) {
		error(503, `OAuth not configured - requires https URL`);
	}

	const { session } = await oauth.callback(url.searchParams);

	// create OAuth client to fetch user profile
	const client = new Client({ handler: session });

	// fetch user's profile to get their handle
	const profile = await ok(
		client.call(ComAtprotoRepoDescribeRepo, {
			params: {
				repo: session.did,
			},
		}),
	);

	// create or update user in database
	await upsertUser(session.did, profile.handle);

	const secure = url.protocol === 'https:';

	setSignedCookie(cookies, SESSION_COOKIE, session.did, {
		httpOnly: true,
		secure: secure,
		sameSite: 'lax' as const,
		path: '/',
		maxAge: 60 * 60 * 24 * 30,
	});

	redirect(303, '/');
};
