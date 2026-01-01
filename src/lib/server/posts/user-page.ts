/**
 * user page data aggregation
 *
 * combines user profile and cached posts for /@handle routes.
 * transforms database records into view models for rendering.
 */
import type { Did } from '@atcute/lexicons';

import type { UserPageData, PostView } from '$lib/types';
import { getUserByHandle } from '$lib/server/users';
import { getUserPosts } from '$lib/server/posts';

/**
 * retrieves user page data by handle
 *
 * looks up user by handle and fetches their cached posts.
 * returns null user with empty posts array if handle not found (404 case).
 * transforms database post records into PostView models for rendering.
 *
 * @param handle user's handle (e.g. alice.bsky.social)
 * @returns user page data with profile and posts
 */
export const getUserPageData = async (handle: string): Promise<UserPageData> => {
	const user = await getUserByHandle(handle);

	if (!user) {
		return {
			user: null,
			posts: [],
		};
	}

	const posts = await getUserPosts(user.did as Did, 50);

	return {
		user: {
			did: user.did,
			handle: user.handle,
			customCss: user.customCss,
		},
		posts: posts.map((post) => ({
			uri: post.uri,
			cid: post.cid,
			text: post.text,
			createdAt: post.createdAt,
			hasImages: post.hasImages,
			hasEmbed: post.hasEmbed,
			embedData: post.embedData,
		})),
	};
};
