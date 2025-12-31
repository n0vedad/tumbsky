<script lang="ts">
	import type { PageData } from './$types';

	import Header from '$lib/components/header.svelte';

	const { data }: { data: PageData } = $props();

	const currentUser = $derived(data.currentUser);
	const user = $derived(data.user);

	let isSyncing = $state(false);
	let syncError = $state<string | null>(null);
	let syncSuccess = $state(false);
	let syncedCount = $state(0);

	async function syncPosts() {
		isSyncing = true;
		syncError = null;
		syncSuccess = false;

		try {
			const response = await fetch('/api/sync', { method: 'POST' });
			const data = await response.json();

			if (!response.ok || !data.success) {
				syncError = data.error || 'failed to sync posts. please try again.';
			} else {
				syncSuccess = true;
				syncedCount = data.syncedCount || 0;
				// auto-hide success message after 5 seconds
				setTimeout(() => {
					syncSuccess = false;
				}, 5000);
			}
		} catch (error) {
			syncError = 'network error. please check your connection and try again.';
		} finally {
			isSyncing = false;
		}
	}
</script>

<div class="container">
	<Header {currentUser} />

	{#if currentUser && user}
		<div class="welcome-card">
			<h2>welcome back, @{user.handle}!</h2>
			<p class="subtitle">your personalized Bluesky page with custom styling</p>

			<div class="actions">
				<a href="/@{user.handle}" class="btn btn-primary">view your page</a>
				<a href="/settings" class="btn btn-secondary">customize CSS</a>
			</div>

			<div class="info-section">
				<h3>sync your posts</h3>
				<p>click below to sync your latest posts from Bluesky</p>

				{#if syncSuccess}
					<div class="alert alert-success">
						successfully synced {syncedCount} post{syncedCount !== 1 ? 's' : ''}!
					</div>
				{/if}

				{#if syncError}
					<div class="alert alert-error">{syncError}</div>
				{/if}

				<button class="btn btn-accent" onclick={syncPosts} disabled={isSyncing}>
					{isSyncing ? 'syncing...' : 'sync posts'}
				</button>
			</div>
		</div>
	{:else}
		<div class="card">
			<h1 class="card-title">welcome to tumbsky</h1>
			<p class="card-text">display your Bluesky posts with custom CSS styling</p>
			<p class="card-text">create your personalized page, tumblr-style</p>
			<a href="/login" class="btn btn-primary">sign in with Bluesky</a>
		</div>
	{/if}
</div>

<style>
	.container {
		margin: 0 auto;
		padding: 2rem 1rem;
		max-width: 600px;
	}

	.card {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background-color: var(--color-bg-elevated);
		padding: 2rem;
		text-align: center;
	}

	.card-title {
		margin-bottom: 1rem;
		font-weight: 700;
		font-size: 1.75rem;
	}

	.card-text {
		margin-bottom: 0.5rem;
		color: var(--color-text-muted);
		font-size: 1rem;
	}

	.welcome-card {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background-color: var(--color-bg-elevated);
		padding: 2rem;
	}

	.welcome-card h2 {
		margin-bottom: 0.5rem;
		font-weight: 700;
		font-size: 1.5rem;
	}

	.subtitle {
		margin-bottom: 1.5rem;
		color: var(--color-text-muted);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 2rem;
	}

	@media (max-width: 640px) {
		.actions {
			flex-direction: column;
		}

		.actions a {
			width: 100%;
		}
	}

	.info-section {
		border-top: 1px solid var(--color-border);
		padding-top: 1.5rem;
	}

	.info-section h3 {
		margin-bottom: 0.5rem;
		font-weight: 600;
		font-size: 1.125rem;
	}

	.info-section p {
		margin-bottom: 1rem;
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.btn {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		transition: background-color 0.15s;
		cursor: pointer;
		border: none;
		border-radius: var(--radius-md);
		padding: 0.625rem 1rem;
		font-weight: 500;
		font-size: 0.875rem;
		text-decoration: none;
	}

	.btn-primary {
		flex: 1;
		background-color: var(--color-accent);
		color: white;
	}

	.btn-primary:hover {
		background-color: var(--color-accent-hover);
	}

	.btn-secondary {
		flex: 1;
		border: 1px solid var(--color-border);
		background-color: var(--color-bg);
		color: var(--color-text);
	}

	.btn-secondary:hover {
		background-color: var(--color-bg-elevated);
	}

	.btn-accent {
		background-color: var(--color-accent);
		color: white;
	}

	.btn-accent:hover {
		background-color: var(--color-accent-hover);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.alert {
		margin-bottom: 1rem;
		border-radius: var(--radius-md);
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.alert-success {
		border: 1px solid #10b981;
		background-color: #d1fae5;
		color: #065f46;
	}

	.alert-error {
		border: 1px solid #ef4444;
		background-color: #fee2e2;
		color: #991b1b;
	}
</style>
