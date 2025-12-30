import { invalid } from '@sveltejs/kit';

import * as v from 'valibot';

import { form } from '$app/server';

import { requireAuth } from '$lib/server/auth';
import { updateUserCss } from '$lib/server/users';

/**
 * saves the user's custom CSS
 */
export const saveCustomCss = form(
	v.object({
		customCss: v.string(),
	}),
	async ({ customCss }) => {
		const { session } = await requireAuth();

		// sanitize CSS (basic - remove script tags)
		const sanitized = customCss.replace(/<script[\s\S]*?<\/script>/gi, '');

		try {
			await updateUserCss(session.did, sanitized);
		} catch (error) {
			console.error('failed to save custom CSS:', error);
			invalid('could not save custom CSS');
		}
	},
);
