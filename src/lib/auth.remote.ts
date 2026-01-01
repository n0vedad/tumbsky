/**
 * authentication form actions
 *
 * server-side form handlers for OAuth login and logout.
 * uses SvelteKit remoteFunctions feature for type-safe form submissions.
 */
import { invalid, redirect } from '@sveltejs/kit';

import * as v from 'valibot';

import { ActorResolutionError } from '@atcute/identity-resolver';
import { isActorIdentifier, type ActorIdentifier } from '@atcute/lexicons/syntax';
import { OAuthResolverError } from '@atcute/oauth-node-client';

import { form, getRequestEvent } from '$app/server';

import { SESSION_COOKIE } from './server/auth';
import { getOAuth } from './server/oauth';

/**
 * valibot validator for ATProto actor identifiers
 *
 * accepts both handles (alice.bsky.social) and DIDs (did:plc:...).
 */
const actorIdentifierString = v.custom<ActorIdentifier>(
	(input) => isActorIdentifier(input),
	`please enter a valid handle (e.g. alice.bsky.social) or DID`,
);

/**
 * initiates OAuth login flow
 *
 * resolves handle/DID to PDS, initiates PKCE flow, and redirects to authorization server.
 * stores OAuth state in database for callback verification.
 *
 * @throws invalid if OAuth not configured (requires HTTPS)
 * @throws invalid if identifier resolution fails
 * @redirects to OAuth authorization URL on success
 */
export const doLogin = form(
	v.object({
		identifier: actorIdentifierString,
	}),
	async ({ identifier }) => {
		const oauth = await getOAuth();
		if (!oauth) {
			invalid(`OAuth requires https - use cloudflared or ngrok for local testing (see README.md)`);
		}

		let url: URL;

		try {
			const result = await oauth.authorize({
				target: {
					type: 'account',
					identifier: identifier,
				},
			});

			url = result.url;
		} catch (err) {
			// handle identifier resolution failures
			if (err instanceof OAuthResolverError) {
				if (err.cause instanceof ActorResolutionError) {
					invalid(`that identifier doesn't seem to be valid`);
				}
			}

			console.error(`failed to authenticate ${identifier}:`, err);

			invalid(`could not initiate login`);
		}

		redirect(303, url.href);
	},
);

/**
 * logs out current user
 *
 * deletes session cookie to invalidate authentication.
 * OAuth session remains in database but is no longer accessible without cookie.
 *
 * @redirects to home page after logout
 */
export const doLogout = form(async () => {
	const { cookies } = getRequestEvent();

	cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(303, '/');
});
