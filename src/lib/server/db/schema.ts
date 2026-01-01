/**
 * Drizzle ORM schema definitions for Tumbsky
 *
 * defines OAuth session storage and Tumbsky-specific tables (users, posts).
 * indexes optimize common queries (user posts, chronological ordering).
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { AppBskyFeedPost } from '@atcute/bluesky';
import type { StoredSession, StoredState } from '@atcute/oauth-node-client';

/**
 * OAuth state storage for PKCE flow
 *
 * stores temporary state during OAuth authorization.
 * indexed by expiresAt for efficient cleanup of expired states.
 */
export const oauthState = sqliteTable(
	'oauth_state',
	{
		key: text('key').primaryKey(),
		state: text('state', { mode: 'json' }).$type<StoredState>().notNull(),
		expiresAt: integer('expires_at').notNull(),
	},
	(table) => [index('oauth_state_expires_at_idx').on(table.expiresAt)],
);

/**
 * OAuth session storage for authenticated users
 *
 * stores encrypted OAuth tokens keyed by DID.
 * indexed by updatedAt for session expiration cleanup.
 */
export const oauthSession = sqliteTable(
	'oauth_session',
	{
		did: text('did').primaryKey(),
		session: text('session', { mode: 'json' }).$type<StoredSession>().notNull(),
		updatedAt: integer('updated_at').notNull(),
	},
	(table) => [index('oauth_session_updated_at_idx').on(table.updatedAt)],
);

/**
 * users table for Tumbsky-specific settings
 *
 * stores custom CSS, theme preferences, and handle for each user.
 * separate from OAuth session to allow settings persistence across re-authentication.
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
 * posts table for cached Bluesky posts
 *
 * stores denormalized post data for fast rendering without ATProto API calls.
 * indexed by userDid for user page queries and createdAt for chronological ordering.
 * embedData stores structured embed info (images, quotes, etc.) as JSON.
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
