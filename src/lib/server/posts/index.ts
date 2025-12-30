import { desc, eq } from 'drizzle-orm';

import type { AppBskyFeedPost } from '@atcute/bluesky';
import { ok, type Client } from '@atcute/client';
import type { Did } from '@atcute/lexicons';

import { db } from '$lib/server/db';
import { posts } from '$lib/server/db/schema';

/**
 * fetches posts from Bluesky API for a given user
 * @param client authenticated client
 * @param did user's DID
 * @param limit number of posts to fetch (default: 50)
 * @returns array of posts from the API
 */
export const fetchPostsFromApi = async (client: Client, did: Did, limit: number = 50) => {
	// use XRPC to call the getAuthorFeed endpoint
	const response = await ok(
		client.get('app.bsky.feed.getAuthorFeed', {
			params: {
				actor: did,
				limit,
			},
		}),
	);

	return response.feed as Array<{
		post: { uri: string; cid: string; author: { did: string }; record: unknown };
	}>;
};

/**
 * saves a post to the database
 * @param userDid user's DID
 * @param uri post URI
 * @param cid post CID
 * @param record post record
 */
export const savePost = async (
	userDid: Did,
	uri: string,
	cid: string,
	record: AppBskyFeedPost.Main,
) => {
	const now = Date.now();

	// extract text from post
	const text = record.text || '';

	// check for images
	const hasImages =
		record.embed?.$type === 'app.bsky.embed.images' ||
		record.embed?.$type === 'app.bsky.embed.recordWithMedia';

	// check for any embed
	const hasEmbed = !!record.embed;

	// store embed data as JSON if present
	const embedData = record.embed ? JSON.stringify(record.embed) : null;

	// parse createdAt timestamp
	const createdAt = new Date(record.createdAt).getTime();

	// extract rkey from URI (format: at://did/app.bsky.feed.post/rkey)
	const rkey = uri.split('/').pop() || '';

	// check if post already exists
	const existingPost = await db.select().from(posts).where(eq(posts.uri, uri)).get();

	if (existingPost) {
		// update existing post
		await db
			.update(posts)
			.set({
				cid,
				record,
				text,
				hasImages,
				hasEmbed,
				embedData,
				indexedAt: now,
			})
			.where(eq(posts.uri, uri))
			.run();
	} else {
		// insert new post
		await db
			.insert(posts)
			.values({
				uri,
				userDid,
				cid,
				rkey,
				record,
				text,
				hasImages,
				hasEmbed,
				embedData,
				createdAt,
				indexedAt: now,
			})
			.run();
	}
};

/**
 * syncs posts from Bluesky API to database for a user
 * @param client authenticated client
 * @param did user's DID
 * @param limit number of posts to fetch (default: 50)
 * @returns number of posts synced
 */
export const syncUserPosts = async (client: Client, did: Did, limit: number = 50) => {
	const feed = await fetchPostsFromApi(client, did, limit);

	let syncedCount = 0;

	for (const item of feed) {
		// only sync posts authored by this user (not reposts)
		if (item.post.author.did === did) {
			// check if this is actually a post (not a reply without checking)
			const record = item.post.record as AppBskyFeedPost.Main;

			if (record.$type === 'app.bsky.feed.post') {
				await savePost(did, item.post.uri, item.post.cid, record);
				syncedCount++;
			}
		}
	}

	return syncedCount;
};

/**
 * gets posts for a user from database
 * @param did user's DID
 * @param limit number of posts to return (default: 50)
 * @returns array of posts
 */
export const getUserPosts = async (did: Did, limit: number = 50) => {
	return await db
		.select()
		.from(posts)
		.where(eq(posts.userDid, did))
		.orderBy(desc(posts.createdAt))
		.limit(limit)
		.all();
};

/**
 * gets a single post by URI
 * @param uri post URI
 * @returns post or undefined if not found
 */
export const getPostByUri = async (uri: string) => {
	return await db.select().from(posts).where(eq(posts.uri, uri)).get();
};

/**
 * deletes a post from database
 * @param uri post URI
 */
export const deletePost = async (uri: string) => {
	await db.delete(posts).where(eq(posts.uri, uri)).run();
};
