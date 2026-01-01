/**
 * settings form actions
 *
 * server-side handlers for user settings updates (custom CSS).
 * uses SvelteKit remoteFunctions for type-safe form submissions.
 */
import { invalid } from '@sveltejs/kit';

import * as v from 'valibot';

import { form } from '$app/server';

import { requireAuth } from '$lib/server/auth';
import { updateUserCss } from '$lib/server/users';

/**
 * saves user's custom CSS
 *
 * performs basic sanitization (removes script tags) before storing.
 * actual CSS sanitization happens in API endpoint via css-sanitizer.ts.
 * this is just a defense-in-depth measure for form submissions.
 *
 * @throws invalid if database update fails
 * @throws 401 if not authenticated (via requireAuth)
 */
export const saveCustomCss = form(
	v.object({
		customCss: v.string(),
	}),
	async ({ customCss }) => {
		const { session } = await requireAuth();

		// basic sanitization - full sanitization in API endpoint
		const sanitized = customCss.replace(/<script[\s\S]*?<\/script>/gi, '');

		try {
			await updateUserCss(session.did, sanitized);
		} catch (error) {
			console.error('failed to save custom CSS:', error);
			invalid('could not save custom CSS');
		}
	},
);
