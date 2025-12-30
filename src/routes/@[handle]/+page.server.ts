import type { PageServerLoad } from './$types';

import { getUserPageData } from '$lib/server/posts/user-page';

export const load: PageServerLoad = async ({ params }) => {
	return await getUserPageData(params.handle);
};
