import { json } from '@sveltejs/kit';

import { requireAuth } from '$lib/server/auth';
import { updateUserCss } from '$lib/server/users';
import { sanitizeCSS } from '$lib/server/css-sanitizer';

/**
 * POST /api/settings/css
 * saves the authenticated user's custom CSS
 */
export const POST = async ({ request }) => {
	const { session } = await requireAuth();

	const { customCss } = await request.json();

	try {
		// allow empty string to clear CSS
		if (customCss === '' || customCss === null || customCss === undefined) {
			await updateUserCss(session.did, '');
			return json({
				success: true,
			});
		}

		// sanitize CSS using PostCSS-based sanitizer
		const sanitized = await sanitizeCSS(customCss);

		if (sanitized === null) {
			return json(
				{
					success: false,
					error: 'CSS is empty or invalid',
				},
				{ status: 400 },
			);
		}

		await updateUserCss(session.did, sanitized);

		return json({
			success: true,
		});
	} catch (error) {
		console.error('CSS sanitization error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'failed to save CSS',
			},
			{ status: 400 },
		);
	}
}
