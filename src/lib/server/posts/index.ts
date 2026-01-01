/**
 * post synchronization and database operations
 *
 * fetches posts from Bluesky API and caches them in database.
 * denormalizes post data (text, embeds, images) for fast rendering.
 */
import { desc, eq } from 'drizzle-orm';

import type { AppBskyFeedPost } from '@atcute/bluesky';
import { ok, type Client } from '@atcute/client';
import type { Did } from '@atcute/lexicons';

import { db } from '$lib/server/db';
import { posts } from '$lib/server/db/schema';

/**
 * fetches posts from Bluesky API for a user
 *
 * calls app.bsky.feed.getAuthorFeed XRPC endpoint.
 * returns feed items including posts, reposts, and replies.
 *
 * @param client authenticated ATProto client
 * @param did user's DID
 * @param limit number of posts to fetch (max 100)
 * @returns array of feed items with post data
 */
export const fetchPostsFromApi = async (client: Client, did: Did, limit: number = 50) => {
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
 * saves or updates a post in database
 *
 * extracts text, images, and embed data for fast rendering.
 * upserts to handle both new posts and edits (when CID changes).
 * stores full record as JSON for future flexibility.
 *
 * @param userDid user's DID
 * @param uri post URI (at://did/app.bsky.feed.post/rkey)
 * @param cid post CID (content hash)
 * @param record post record from API
 */
export const savePost = async (userDid: Did, uri: string, cid: string, record: AppBskyFeedPost.Main) => {
	const now = Date.now();

	const text = record.text || '';

	// detect image embeds (direct or with media)
	const hasImages =
		record.embed?.$type === 'app.bsky.embed.images' ||
		record.embed?.$type === 'app.bsky.embed.recordWithMedia';

	const hasEmbed = !!record.embed;

	// serialize embed for rendering (images, quotes, external links)
	const embedData = record.embed ? JSON.stringify(record.embed) : null;

	const createdAt = new Date(record.createdAt).getTime();

	// extract rkey from URI (at://did/app.bsky.feed.post/rkey)
	const rkey = uri.split('/').pop() || '';

	const existingPost = await db.select().from(posts).where(eq(posts.uri, uri)).get();

	if (existingPost) {
		// update if CID changed (post was edited)
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
 * syncs user posts from Bluesky API to database
 *
 * fetches recent posts and saves them. filters out reposts to only store
 * original posts by this user. called manually via /api/sync or automatically
 * via Firehose ingestion.
 *
 * @param client authenticated ATProto client
 * @param did user's DID
 * @param limit number of posts to fetch
 * @returns number of posts synced
 */
export const syncUserPosts = async (client: Client, did: Did, limit: number = 50) => {
	const feed = await fetchPostsFromApi(client, did, limit);

	let syncedCount = 0;

	for (const item of feed) {
		// skip reposts (only sync posts authored by this user)
		if (item.post.author.did === did) {
			const record = item.post.record as AppBskyFeedPost.Main;

			// verify it's a post record (not a different type)
			if (record.$type === 'app.bsky.feed.post') {
				await savePost(did, item.post.uri, item.post.cid, record);
				syncedCount++;
			}
		}
	}

	return syncedCount;
};

/**
 * retrieves posts for a user from database
 *
 * returns cached posts ordered chronologically.
 * avoids API calls for fast page rendering.
 *
 * @param did user's DID
 * @param limit number of posts to return
 * @returns array of posts in descending order by createdAt
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
 * retrieves a single post by URI
 *
 * @param uri post URI (at://did/app.bsky.feed.post/rkey)
 * @returns post record or undefined if not found
 */
export const getPostByUri = async (uri: string) => {
	return await db.select().from(posts).where(eq(posts.uri, uri)).get();
};

/**
 * deletes a post from database
 *
 * called when post is deleted via Firehose event.
 *
 * @param uri post URI to delete
 */
export const deletePost = async (uri: string) => {
	await db.delete(posts).where(eq(posts.uri, uri)).run();
};
