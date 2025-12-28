import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { AppBskyFeedPost } from '@atcute/bluesky';
import type { StoredSession, StoredState } from '@atcute/oauth-node-client';

export const oauthState = sqliteTable(
	'oauth_state',
	{
		key: text('key').primaryKey(),
		state: text('state', { mode: 'json' }).$type<StoredState>().notNull(),
		expiresAt: integer('expires_at').notNull(),
	},
	(table) => [index('oauth_state_expires_at_idx').on(table.expiresAt)],
);

export const oauthSession = sqliteTable(
	'oauth_session',
	{
		did: text('did').primaryKey(),
		session: text('session', { mode: 'json' }).$type<StoredSession>().notNull(),
		updatedAt: integer('updated_at').notNull(),
	},
	(table) => [index('oauth_session_updated_at_idx').on(table.updatedAt)],
);

// tumbsky-specific tables

/**
 * users table for storing user-specific settings and custom CSS
 */
export const users = sqliteTable('users', {
	did: text('did').primaryKey(),
	handle: text('handle').notNull(),
	customCss: text('custom_css'),
	themeName: text('theme_name'),
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull(),
});

/**
 * posts table for storing Bluesky posts (app.bsky.feed.post)
 */
export const posts = sqliteTable(
	'posts',
	{
		uri: text('uri').primaryKey(),
		userDid: text('user_did')
			.notNull()
			.references(() => users.did),
		cid: text('cid').notNull(),
		rkey: text('rkey').notNull(),
		record: text('record', { mode: 'json' }).$type<AppBskyFeedPost.Main>().notNull(),
		text: text('text').notNull(),
		hasImages: integer('has_images', { mode: 'boolean' }).notNull().default(false),
		hasEmbed: integer('has_embed', { mode: 'boolean' }).notNull().default(false),
		embedData: text('embed_data', { mode: 'json' }),
		createdAt: integer('created_at').notNull(),
		indexedAt: integer('indexed_at').notNull(),
	},
	(table) => [
		index('posts_user_did_idx').on(table.userDid),
		index('posts_created_at_idx').on(table.createdAt),
	],
);
