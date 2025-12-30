import { json } from '@sveltejs/kit';

import { requireAuth } from '$lib/server/auth';
import { syncUserPosts } from '$lib/server/posts';

/**
 * POST /api/sync
 * syncs the authenticated user's posts from Bluesky
 */
export const POST = async () => {
	const { session, client } = await requireAuth();

	const syncedCount = await syncUserPosts(client, session.did);

	return json({
		success: true,
		syncedCount,
	});
};
