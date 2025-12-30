import { eq } from 'drizzle-orm';

import type { Did } from '@atcute/lexicons';

import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

/**
 * creates or updates a user in the database
 * @param did user's DID
 * @param handle user's handle
 * @returns the created or updated user
 */
export const upsertUser = async (did: Did, handle: string) => {
	const now = Date.now();

	const existingUser = await db.select().from(users).where(eq(users.did, did)).get();

	if (existingUser) {
		// update existing user
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
		// create new user
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
 * gets a user by DID
 * @param did user's DID
 * @returns the user or undefined if not found
 */
export const getUserByDid = async (did: Did) => {
	return await db.select().from(users).where(eq(users.did, did)).get();
};

/**
 * gets a user by handle
 * @param handle user's handle
 * @returns the user or undefined if not found
 */
export const getUserByHandle = async (handle: string) => {
	return await db.select().from(users).where(eq(users.handle, handle)).get();
};

/**
 * updates a user's custom CSS
 * @param did user's DID
 * @param customCss the custom CSS
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
