/**
 * user management and database operations
 *
 * provides CRUD operations for Tumbsky users.
 * handles upserts to sync user data from OAuth/Firehose.
 */
import { eq } from 'drizzle-orm';

import type { Did } from '@atcute/lexicons';

import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

/**
 * creates or updates a user in the database
 *
 * called during OAuth login and Firehose ingestion to keep user data in sync.
 * updates handle if it changed, but preserves custom CSS and theme settings.
 *
 * @param did user's DID (immutable identifier)
 * @param handle user's current handle (can change)
 * @returns the created or updated user record
 */
export const upsertUser = async (did: Did, handle: string) => {
	const now = Date.now();

	const existingUser = await db.select().from(users).where(eq(users.did, did)).get();

	if (existingUser) {
		// update handle if changed, preserve customCss/themeName
		await db
			.update(users)
			.set({
				handle,
				updatedAt: now,
			})
			.where(eq(users.did, did))
			.run();

		return { ...existingUser, handle, updatedAt: now };
	} else {
		// create new user with default settings
		await db
			.insert(users)
			.values({
				did,
				handle,
				customCss: null,
				themeName: null,
				createdAt: now,
				updatedAt: now,
			})
			.run();

		return {
			did,
			handle,
			customCss: null,
			themeName: null,
			createdAt: now,
			updatedAt: now,
		};
	}
};

/**
 * retrieves user by DID
 *
 * primary lookup method since DID is immutable.
 *
 * @param did user's DID
 * @returns user record or undefined if not found
 */
export const getUserByDid = async (did: Did) => {
	return await db.select().from(users).where(eq(users.did, did)).get();
};

/**
 * retrieves user by handle
 *
 * used for public profile pages (/@handle).
 * note that handles can change, so DID is preferred for internal operations.
 *
 * @param handle user's current handle
 * @returns user record or undefined if not found
 */
export const getUserByHandle = async (handle: string) => {
	return await db.select().from(users).where(eq(users.handle, handle)).get();
};

/**
 * updates user's custom CSS
 *
 * called from settings page after CSS sanitization.
 * null value clears custom CSS.
 *
 * @param did user's DID
 * @param customCss sanitized CSS or null to clear
 */
export const updateUserCss = async (did: Did, customCss: string | null) => {
	const now = Date.now();

	await db
		.update(users)
		.set({
			customCss,
			updatedAt: now,
		})
		.where(eq(users.did, did))
		.run();
};
