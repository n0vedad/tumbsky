import type { Did } from '@atcute/lexicons';

import type { UserPageData, PostView } from '$lib/types';
import { getUserByHandle } from '$lib/server/users';
import { getUserPosts } from '$lib/server/posts';

/**
 * gets a user's page data by handle
 * @param handle user's handle
 * @returns user data and posts
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
