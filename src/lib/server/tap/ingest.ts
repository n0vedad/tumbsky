/**
 * Firehose event ingestion
 *
 * processes real-time ATProto events from Tap/Firehose.
 * filters events to only track posts from registered Tumbsky users.
 */
import { AppBskyFeedPost } from '@atcute/bluesky';
import { safeParse } from '@atcute/lexicons/validations';
import type { TapEvent } from '@atcute/tap';
import { eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { posts, users } from '$lib/server/db/schema';

/**
 * constructs AT-URI from components
 *
 * format: at://did/collection/rkey
 */
const toAtUri = (did: string, collection: string, rkey: string): string => {
	return `at://${did}/${collection}/${rkey}`;
};

/**
 * ingests a single Firehose event into database
 *
 * only processes app.bsky.feed.post events for registered Tumbsky users.
 * handles both creates/updates and deletes. validates record schema before ingesting.
 * upserts to handle duplicate events or backfills.
 *
 * @param event Tap event from Firehose
 */
export const ingestTapEvent = async (event: TapEvent): Promise<void> => {
	// ignore identity updates and profile changes (Tumbsky only tracks posts)
	if (event.type === 'identity' || event.collection === 'app.bsky.actor.profile') {
		return;
	}

	if (event.collection === 'app.bsky.feed.post') {
		// only index posts from registered Tumbsky users
		const user = await db.select().from(users).where(eq(users.did, event.did)).get();
		if (!user) {
			return; // skip posts from unregistered users
		}

		const uri = toAtUri(event.did, event.collection, event.rkey);

		if (event.action === 'delete') {
			await db.delete(posts).where(eq(posts.uri, uri)).run();
			return;
		}

		// validate post record schema
		const parsed = safeParse(AppBskyFeedPost.mainSchema, event.record);
		if (!parsed.ok) {
			return; // skip invalid records
		}

		const record = parsed.value;

		const text = record.text || '';
		const hasImages = !!(record.embed?.$type === 'app.bsky.embed.images');
		const hasEmbed = !!record.embed;
		const embedData = record.embed || null;

		const createdAt = Date.parse(record.createdAt);
		const indexedAt = Date.now();

		// upsert to handle both new posts and edits
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
