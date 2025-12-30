import { json } from '@sveltejs/kit';

import { requireAuth } from '$lib/server/auth';
import { getUserPosts } from '$lib/server/posts';

/**
 * GET /api/posts
 * gets the authenticated user's posts from database
 */
export const GET = async ({ url }) => {
	const { session } = await requireAuth();

	const limitParam = url.searchParams.get('limit');
	const limit = limitParam ? parseInt(limitParam, 10) : 50;

	const posts = await getUserPosts(session.did, limit);

	return json({
		posts,
	});
};
