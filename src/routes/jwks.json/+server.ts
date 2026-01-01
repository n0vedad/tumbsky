/**
 * JWKS (JSON Web Key Set) endpoint
 *
 * serves public keys for OAuth token signature verification.
 * required by ATProto OAuth spec for client authentication.
 */
import { error, json } from '@sveltejs/kit';

import { getOAuth } from '$lib/server/oauth';

/**
 * returns public key set in JWKS format
 *
 * authorization servers use this to verify signed client assertions.
 * cached for 60 seconds to reduce load.
 *
 * @returns JWKS with public keys
 * @throws 503 if OAuth not configured
 */
export const GET = async () => {
	const oauth = await getOAuth();
	if (!oauth) {
		error(503, `OAuth not configured - requires https URL`);
	}

	return json(oauth.jwks, {
		headers: {
			'cache-control': 'public, max-age=60',
		},
	});
};
