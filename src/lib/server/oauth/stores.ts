/**
 * OAuth state and session persistence stores
 *
 * implements database-backed storage for OAuth PKCE flow and authenticated sessions.
 * automatically prunes expired state on retrieval to prevent DoS via state accumulation.
 */
import { eq, lte } from 'drizzle-orm';

import type { Did } from '@atcute/lexicons/syntax';
import type { OAuthClientStores, StoredSession, StoredState } from '@atcute/oauth-node-client';

import { db } from '$lib/server/db';
import { oauthSession, oauthState } from '$lib/server/db/schema';

/**
 * database stores for OAuth client
 *
 * sessions: stores encrypted OAuth tokens keyed by DID
 * states: stores temporary PKCE state during authorization flow
 */
export const stores: OAuthClientStores = {
	sessions: {
		/**
		 * retrieves OAuth session by DID
		 *
		 * returns encrypted session tokens for token refresh.
		 */
		async get(did: Did) {
			const row = await db.select().from(oauthSession).where(eq(oauthSession.did, did)).get();
			return row?.session;
		},
		/**
		 * stores or updates OAuth session
		 *
		 * upserts to handle both new sessions and token refreshes.
		 * updates timestamp for session expiration tracking.
		 */
		async set(did: Did, session: StoredSession) {
			const updatedAt = Date.now();

			await db
				.insert(oauthSession)
				.values({ did, session, updatedAt })
				.onConflictDoUpdate({
					target: oauthSession.did,
					set: { session, updatedAt },
				})
				.run();
		},
		/**
		 * deletes OAuth session for DID
		 *
		 * called on logout or session invalidation.
		 */
		async delete(did: Did) {
			await db.delete(oauthSession).where(eq(oauthSession.did, did)).run();
		},
		/**
		 * clears all OAuth sessions
		 *
		 * used for testing or emergency session invalidation.
		 */
		async clear() {
			await db.delete(oauthSession).run();
		},
	},

	states: {
		/**
		 * retrieves OAuth PKCE state by key
		 *
		 * automatically deletes expired state to prevent accumulation.
		 * returns undefined if state not found or expired.
		 */
		async get(key: string) {
			const row = await db.select().from(oauthState).where(eq(oauthState.key, key)).get();
			if (!row) {
				return;
			}

			// delete and return undefined if expired
			if (row.expiresAt <= Date.now()) {
				await db.delete(oauthState).where(eq(oauthState.key, key)).run();
				return;
			}

			return row.state;
		},
		/**
		 * stores OAuth PKCE state
		 *
		 * state contains code verifier and other flow data.
		 * upserts to handle retries during authorization.
		 */
		async set(key: string, state: StoredState) {
			const expiresAt = state.expiresAt;

			await db
				.insert(oauthState)
				.values({ key, state, expiresAt })
				.onConflictDoUpdate({
					target: oauthState.key,
					set: { state, expiresAt },
				})
				.run();
		},
		/**
		 * deletes OAuth state by key
		 *
		 * called after successful authorization to prevent replay.
		 */
		async delete(key: string) {
			await db.delete(oauthState).where(eq(oauthState.key, key)).run();
		},
		/**
		 * clears all OAuth states
		 *
		 * used for testing or emergency cleanup.
		 */
		async clear() {
			await db.delete(oauthState).run();
		},
	},
};

/**
 * removes expired OAuth states from database
 *
 * should be called periodically (e.g., cron job) to prevent state table growth.
 * states are also pruned on retrieval, but this ensures cleanup even if never accessed.
 */
export const pruneExpiredStates = async () => {
	await db.delete(oauthState).where(lte(oauthState.expiresAt, Date.now())).run();
};
