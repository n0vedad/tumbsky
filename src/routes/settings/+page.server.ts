import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

import { getUserByDid } from '$lib/server/users';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) {
		throw redirect(303, '/login');
	}

	const user = await getUserByDid(locals.session.did);

	if (!user) {
		throw redirect(303, '/login');
	}

	return {
		user: {
			did: user.did,
			handle: user.handle,
			customCss: user.customCss,
		},
		currentUser: {
			did: user.did,
			handle: user.handle,
		},
	};
};
