<script lang="ts">
	import { doLogout } from '$lib/auth.remote';
	import tumbskyLogo from '$lib/assets/tumbsky.svg';

	interface Props {
		currentUser?: { did: string; handle: string } | null;
	}

	const { currentUser }: Props = $props();
</script>

<header class="header">
	<img src={tumbskyLogo} alt="tumbsky" class="logo" />

	<div class="actions">
		{#if currentUser}
			<span class="handle">@{currentUser.handle}</span>
			<form
				{...doLogout.enhance(async ({ submit }) => {
					await submit();
					window.location.reload();
				})}
			>
				<button type="submit" class="btn btn-ghost">sign out</button>
			</form>
		{/if}
	</div>
</header>

<style>
	.header {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 0;
	}

	.logo {
		display: block;
		width: min(24rem, 90vw);
		max-width: 500px;
		height: auto;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.handle {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.btn {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		transition:
			background-color 0.15s,
			border-color 0.15s;
		cursor: pointer;
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		padding: 0.5rem 1rem;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background-color: var(--color-accent);
		color: white;
		text-decoration: none;
	}

	.btn-primary:hover {
		background-color: var(--color-accent-hover);
		text-decoration: none;
	}

	.btn-ghost {
		background-color: transparent;
		color: var(--color-text-muted);
	}

	.btn-ghost:hover:not(:disabled) {
		background-color: var(--color-bg-elevated);
		color: var(--color-text);
	}
</style>
