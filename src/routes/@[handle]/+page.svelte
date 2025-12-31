<script lang="ts">
	import type { PageData } from './$types';

	import { page } from '$app/state';

	import PostList from '$lib/components/post-list.svelte';

	const { data }: { data: PageData } = $props();
	const handle = page.params.handle || '';
</script>

<svelte:head>
	{@html data.user?.customCss ? `<style>${data.user.customCss}</style>` : ''}
</svelte:head>

<div class="page">
	{#if data.user}
		<nav class="back-nav">
			<a href="/">← back to home</a>
		</nav>

		<header class="header">
			<h1 class="handle">@{data.user.handle}</h1>
		</header>

		<PostList posts={data.posts} />

		<nav class="back-nav back-nav-bottom">
			<a href="/">← back to home</a>
		</nav>
	{:else}
		<div class="error-card">
			<h1>user not found</h1>
			<p>the user @{handle} doesn't exist or hasn't synced their posts yet.</p>
			<a href="/">← back to home</a>
		</div>
	{/if}
</div>

<style>
	.page {
		margin: 0 auto;
		padding: 2rem 1rem;
		max-width: 680px;
	}

	.back-nav {
		margin-bottom: 1.5rem;
	}

	.back-nav a {
		transition: color 0.15s;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		text-decoration: none;
	}

	.back-nav a:hover {
		color: var(--color-accent);
	}

	.back-nav-bottom {
		margin-top: 3rem;
		margin-bottom: 0;
		text-align: center;
	}

	.header {
		margin-bottom: 2rem;
		text-align: center;
	}

	.handle {
		color: var(--color-text);
		font-weight: 700;
		font-size: 2rem;
	}

	.error-card {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background-color: var(--color-bg-elevated);
		padding: 2rem;
		text-align: center;
	}

	.error-card h1 {
		margin-bottom: 0.5rem;
		font-size: 1.5rem;
	}

	.error-card p {
		margin-bottom: 1.5rem;
		color: var(--color-text-muted);
	}

	.error-card a {
		color: var(--color-accent);
		text-decoration: none;
	}

	.error-card a:hover {
		text-decoration: underline;
	}
</style>
