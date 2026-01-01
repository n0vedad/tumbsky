/**
 * SvelteKit server hooks - session loading and optional Firehose subscription
 *
 * handle() runs on every request to load session from signed cookie.
 * Tap/Firehose subscription runs in background for real-time post updates.
 */
import type { Handle } from '@sveltejs/kit';

import { env } from '$env/dynamic/private';

import { SESSION_COOKIE } from '$lib/server/auth';
import { getSignedCookie } from '$lib/server/auth/signed-cookie';
import { runMigrations } from '$lib/server/db/migrate';

// run migrations on startup
await runMigrations();

/**
 * loads session from signed cookie into event.locals
 *
 * runs on every HTTP request. session is validated via HMAC signature.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const sessionDid = getSignedCookie(event.cookies, SESSION_COOKIE);

	if (sessionDid) {
		event.locals.session = { did: sessionDid as `did:${string}:${string}` };
	}

	return resolve(event);
};

// optional Tap/Firehose integration for real-time post updates
// if TAP_URL is not set, users will need to manually sync posts
if (env.TAP_URL) {
	const { TapClient } = await import('@atcute/tap');
	const { runTapSubscription } = await import('$lib/server/tap');

	// for production deployments, consider running the firehose ingestion in a
	// separate sidecar process. the throughput from Tap (especially during
	// backfilling of existing repos) can overwhelm the server and block HTTP
	// request processing.
	const tap = new TapClient({
		url: env.TAP_URL,
		adminPassword: env.TAP_ADMIN_PASSWORD || undefined,
	});

	void runTapSubscription(tap).catch((err) => {
		console.error('Tap subscription error:', err);
	});

	console.log(`Tap subscription started: ${env.TAP_URL}`);
} else {
	console.log('Tap/Firehose disabled - using manual sync only');
}
