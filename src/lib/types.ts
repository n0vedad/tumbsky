export interface PostView {
	uri: string;
	cid: string;
	text: string;
	createdAt: number;
	hasImages: boolean;
	hasEmbed: boolean;
	embedData: unknown;
}

export interface UserPageData {
	user: {
		did: string;
		handle: string;
		customCss: string | null;
	} | null;
	posts: PostView[];
}
