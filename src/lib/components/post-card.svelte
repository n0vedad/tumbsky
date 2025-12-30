<script lang="ts">
	import type { PostView } from '$lib/types';

	interface Props {
		post: PostView;
	}

	const { post }: Props = $props();

	const formattedDate = $derived(() => {
		const date = new Date(post.createdAt);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	});
</script>

<article class="post-card">
	<div class="post-content">
		<p class="post-text">{post.text}</p>

		{#if post.hasImages}
			<div class="post-meta">
				<span class="meta-badge">📷 has images</span>
			</div>
		{/if}

		{#if post.hasEmbed && !post.hasImages}
			<div class="post-meta">
				<span class="meta-badge">🔗 has embed</span>
			</div>
		{/if}
	</div>

	<footer class="post-footer">
		<time class="post-date" datetime={new Date(post.createdAt).toISOString()}>
			{formattedDate()}
		</time>
	</footer>
</article>

<style>
	/* Use :global() to allow custom CSS to override these styles easily */
	:global(.post-card) {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background-color: var(--color-bg-elevated);
		padding: 1.5rem;
		margin-bottom: 1rem;
		transition: box-shadow 0.2s;
	}

	@media (max-width: 640px) {
		:global(.post-card) {
			padding: 1rem;
		}
	}

	:global(.post-card:hover) {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	:global(.post-content) {
		margin-bottom: 1rem;
	}

	:global(.post-text) {
		white-space: pre-wrap;
		word-wrap: break-word;
		line-height: 1.6;
	}

	:global(.post-meta) {
		margin-top: 0.75rem;
	}

	:global(.meta-badge) {
		display: inline-block;
		border-radius: var(--radius-md);
		background-color: var(--color-bg);
		padding: 0.25rem 0.5rem;
		color: var(--color-text-muted);
		font-size: 0.75rem;
	}

	:global(.post-footer) {
		display: flex;
		justify-content: flex-end;
		padding-top: 0.75rem;
		border-top: 1px solid var(--color-border);
	}

	:global(.post-date) {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}
</style>
