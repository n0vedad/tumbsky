/**
 * OAuth client metadata endpoint
 *
 * serves client configuration for ATProto OAuth discovery.
 * authorization servers fetch this to validate the client.
 */
import { error, json } from '@sveltejs/kit';

import { getOAuth } from '$lib/server/oauth';

/**
 * returns OAuth client metadata
 *
 * includes client_id, redirect_uris, jwks_uri, and scopes.
 * this URL is used as the client_id in ATProto OAuth (self-hosted client model).
 * cached for 60 seconds.
 *
 * @returns OAuth client metadata JSON
 * @throws 503 if OAuth not configured
 */
export const GET = async () => {
	const oauth = await getOAuth();
	if (!oauth) {
		error(503, `OAuth not configured - requires https URL`);
	}

	return json(oauth.metadata, {
		headers: {
			'cache-control': 'public, max-age=60',
		},
	});
};
