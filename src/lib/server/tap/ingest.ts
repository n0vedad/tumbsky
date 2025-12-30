import { AppBskyFeedPost } from '@atcute/bluesky';
import { safeParse } from '@atcute/lexicons/validations';
import type { TapEvent } from '@atcute/tap';
import { eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { posts, users } from '$lib/server/db/schema';

const toAtUri = (did: string, collection: string, rkey: string): string => {
	return `at://${did}/${collection}/${rkey}`;
};

/**
 * ingests a single tap event into the local database
 * only handles app.bsky.feed.post events for registered tumbsky users
 * @param event tap event
 */
export const ingestTapEvent = async (event: TapEvent): Promise<void> => {
	// ignore identity and profile events - tumbsky only tracks posts
	if (event.type === 'identity' || event.collection === 'app.bsky.actor.profile') {
		return;
	}

	if (event.collection === 'app.bsky.feed.post') {
		// only index posts from registered users
		const user = await db.select().from(users).where(eq(users.did, event.did)).get();
		if (!user) {
			return;
		}

		const uri = toAtUri(event.did, event.collection, event.rkey);

		if (event.action === 'delete') {
			await db.delete(posts).where(eq(posts.uri, uri)).run();
			return;
		}

		const parsed = safeParse(AppBskyFeedPost.mainSchema, event.record);
		if (!parsed.ok) {
			return;
		}

		const record = parsed.value;

		// extract post data
		const text = record.text || '';
		const hasImages = !!(record.embed?.$type === 'app.bsky.embed.images');
		const hasEmbed = !!record.embed;
		const embedData = record.embed || null;

		const createdAt = Date.parse(record.createdAt);
		const indexedAt = Date.now();

		await db
			.insert(posts)
			.values({
				uri,
				userDid: event.did,
				cid: event.cid,
				rkey: event.rkey,
				record,
				text,
				hasImages,
				hasEmbed,
				embedData,
				createdAt: Number.isNaN(createdAt) ? indexedAt : createdAt,
				indexedAt,
			})
			.onConflictDoUpdate({
				target: posts.uri,
				set: {
					record,
					text,
					hasImages,
					hasEmbed,
					embedData,
					indexedAt,
				},
			})
			.run();
	}
};
