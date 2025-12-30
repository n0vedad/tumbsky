import type { PageServerLoad } from './$types';

import { getUserByDid } from '$lib/server/users';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) {
		return {
			user: null,
			currentUser: null,
		};
	}

	const user = await getUserByDid(locals.session.did);

	return {
		user,
		currentUser: user ? { did: user.did, handle: user.handle } : null,
	};
};
