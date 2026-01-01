/**
 * shared TypeScript types for Tumbsky
 *
 * defines view models for posts and user pages.
 * keeps type definitions consistent between server and client code.
 */

/**
 * post view model for rendering
 *
 * simplified version of database post record with only fields needed for display.
 * embedData contains serialized embed (images, quotes, links) as JSON.
 */
export interface PostView {
	uri: string;
	cid: string;
	text: string;
	createdAt: number;
	hasImages: boolean;
	hasEmbed: boolean;
	embedData: unknown;
}

/**
 * user page data model
 *
 * contains user info and their cached posts.
 * user is null if handle not found (404 page).
 */
export interface UserPageData {
	user: {
		did: string;
		handle: string;
		customCss: string | null;
	} | null;
	posts: PostView[];
}
