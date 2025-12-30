<script lang="ts">
	import type { PostView } from '$lib/types';

	import PostCard from './post-card.svelte';

	interface Props {
		posts: PostView[];
	}

	const { posts }: Props = $props();
</script>

<div class="post-list">
	{#if posts.length === 0}
		<div class="empty-state">
			<p>no posts yet</p>
			<p class="empty-hint">posts will appear here after syncing</p>
		</div>
	{:else}
		{#each posts as post (post.uri)}
			<PostCard {post} />
		{/each}
	{/if}
</div>

<style>
	.post-list {
		width: 100%;
	}

	.empty-state {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background-color: var(--color-bg-elevated);
		padding: 3rem 2rem;
		text-align: center;
	}

	.empty-state p {
		margin-bottom: 0.5rem;
		font-weight: 500;
		font-size: 1.125rem;
		color: var(--color-text);
	}

	.empty-hint {
		margin-bottom: 0 !important;
		color: var(--color-text-muted) !important;
		font-weight: 400 !important;
		font-size: 0.875rem !important;
	}
</style>
