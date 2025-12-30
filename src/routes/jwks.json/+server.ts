import { error, json } from '@sveltejs/kit';

import { getOAuth } from '$lib/server/oauth';

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
