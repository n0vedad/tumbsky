<script lang="ts">
	import type { PageData } from './$types';

	import Header from '$lib/components/header.svelte';

	const { data }: { data: PageData } = $props();

	const currentUser = $derived(data.currentUser);
	const user = $derived(data.user);

	let customCss = $state('');

	$effect(() => {
		customCss = user?.customCss || '';
	});
	let isSaving = $state(false);
	let saveError = $state<string | null>(null);
	let saveSuccess = $state(false);
	let showPreview = $state(false);
	let showClearConfirm = $state(false);

	// update preview styles whenever customCss changes and preview is active
	$effect(() => {
		if (showPreview && typeof document !== 'undefined') {
			let styleEl = document.getElementById('tumbsky-preview-styles') as HTMLStyleElement;
			if (!styleEl) {
				styleEl = document.createElement('style');
				styleEl.id = 'tumbsky-preview-styles';
				document.head.appendChild(styleEl);
			}
			// Prefix all selectors with .preview-post for proper scoping
			const prefixedCss = customCss
				.split('}')
				.map((rule) => {
					const trimmed = rule.trim();
					if (!trimmed) return '';
					const [selector, ...rest] = trimmed.split('{');
					if (!selector || rest.length === 0) return trimmed;
					return `.preview-post ${selector.trim()} { ${rest.join('{')}`;
				})
				.join('}\n');
			styleEl.textContent = prefixedCss;
		}
	});

	function loadPreview() {
		showPreview = true;
	}

	async function handleSave() {
		isSaving = true;
		saveError = null;
		saveSuccess = false;

		try {
			const response = await fetch('/api/settings/css', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ customCss }),
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				saveError = data.error || 'failed to save CSS. please try again.';
			} else {
				saveSuccess = true;
				setTimeout(() => {
					saveSuccess = false;
				}, 3000);
			}
		} catch (error) {
			saveError = 'network error. please check your connection and try again.';
		} finally {
			isSaving = false;
		}
	}

	async function handleClear() {
		customCss = '';
		showClearConfirm = false;
		await handleSave();
	}

	const exampleCss = `.post-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
}

.post-text {
  font-family: 'Georgia', serif;
  font-size: 1.1rem;
}

.post-date {
  color: rgba(255, 255, 255, 0.8);
}`;
</script>

<div class="container">
	<Header {currentUser} />

	<div class="settings-page">
		<nav class="back-nav">
			<a href="/">← back to home</a>
		</nav>

		<header class="page-header">
			<h1>customize your page</h1>
			<p class="subtitle">add custom CSS to style your posts</p>
		</header>

		<div class="editor-section">
			<div class="editor-header">
				<h2>CSS editor</h2>
				<div class="actions">
					<button
						class="btn btn-secondary"
						onclick={() => {
							customCss = exampleCss;
						}}
					>
						load example
					</button>
					<button class="btn btn-secondary" onclick={loadPreview}>load preview</button>
					{#if user?.customCss}
						<button class="btn btn-danger" onclick={() => (showClearConfirm = true)} disabled={isSaving}>
							clear CSS
						</button>
					{/if}
					<button class="btn btn-primary" onclick={handleSave} disabled={isSaving}>
						{isSaving ? 'saving...' : 'save CSS'}
					</button>
				</div>
			</div>

			{#if showClearConfirm}
				<div class="confirm-card">
					<h3>clear custom CSS?</h3>
					<p>this will permanently remove your custom CSS. this action cannot be undone.</p>
					<div class="confirm-actions">
						<button class="btn btn-secondary" onclick={() => (showClearConfirm = false)}> cancel </button>
						<button class="btn btn-danger" onclick={handleClear} disabled={isSaving}>
							{isSaving ? 'clearing...' : 'yes, clear CSS'}
						</button>
					</div>
				</div>
			{/if}

			{#if saveSuccess}
				<div class="alert alert-success">CSS saved successfully!</div>
			{/if}

			{#if saveError}
				<div class="alert alert-error">{saveError}</div>
			{/if}

			<textarea class="css-editor" bind:value={customCss} placeholder="Enter your custom CSS here...">
			</textarea>

			<div class="help-section">
				<h3>available selectors</h3>
				<ul class="selector-list">
					<li><code>.post-card</code> - individual post container</li>
					<li><code>.post-text</code> - post text content</li>
					<li><code>.post-date</code> - post timestamp</li>
					<li><code>.post-footer</code> - post footer area</li>
					<li><code>.meta-badge</code> - image/embed badges</li>
					<li><code>.handle</code> - your handle on the page</li>
				</ul>
			</div>
		</div>

		{#if user}
			<div class="preview-section">
				<h3>preview</h3>
				{#if showPreview}
					<div class="preview-content">
						<div class="preview-post">
							<div class="post-card">
								<div class="post-text">
									this is a sample post to preview your custom CSS styles. you can see how your posts will
									look with the current CSS.
								</div>
								<div class="post-footer">
									<span class="post-date">2 hours ago</span>
									<span class="meta-badge">📷 has images</span>
								</div>
							</div>
						</div>
					</div>
				{:else}
					<p class="preview-hint">
						click "load preview" to see how your CSS looks, or view your page at <a href="/@{user.handle}"
							>@{user.handle}</a
						>
					</p>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.container {
		margin: 0 auto;
		padding: 2rem 1rem;
		max-width: 900px;
	}

	@media (max-width: 640px) {
		.container {
			padding: 1rem 0.5rem;
		}

		.editor-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.actions {
			width: 100%;
		}

		.actions .btn {
			flex: 1;
		}
	}

	.settings-page {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.back-nav {
		margin-bottom: 0;
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

	.page-header {
		text-align: center;
	}

	.page-header h1 {
		margin-bottom: 0.5rem;
		font-weight: 700;
		font-size: 2rem;
	}

	.subtitle {
		color: var(--color-text-muted);
		font-size: 1rem;
	}

	.editor-section {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background-color: var(--color-bg-elevated);
		padding: 1.5rem;
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.editor-header h2 {
		font-weight: 600;
		font-size: 1.25rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.css-editor {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background-color: var(--color-bg);
		padding: 1rem;
		width: 100%;
		min-height: 300px;
		resize: vertical;
		color: var(--color-text);
		font-size: 0.875rem;
		line-height: 1.6;
		font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
	}

	.css-editor:focus {
		outline: none;
		box-shadow: 0 0 0 3px var(--color-accent-bg);
		border-color: var(--color-accent);
	}

	.help-section {
		margin-top: 1.5rem;
		border-top: 1px solid var(--color-border);
		padding-top: 1.5rem;
	}

	.help-section h3 {
		margin-bottom: 0.75rem;
		font-weight: 600;
		font-size: 1rem;
	}

	.selector-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.selector-list li {
		border-radius: var(--radius-md);
		background-color: var(--color-bg);
		padding: 0.5rem;
		font-size: 0.875rem;
	}

	.selector-list code {
		border-radius: var(--radius-sm);
		background-color: var(--color-accent-bg);
		padding: 0.125rem 0.375rem;
		color: var(--color-accent);
		font-size: 0.8125rem;
		font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
	}

	.preview-section {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background-color: var(--color-bg-elevated);
		padding: 1.5rem;
		text-align: center;
	}

	.preview-section h3 {
		margin-bottom: 0.5rem;
		font-weight: 600;
		font-size: 1.125rem;
	}

	.preview-hint {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.preview-hint a {
		color: var(--color-accent);
		font-weight: 500;
		text-decoration: none;
	}

	.preview-hint a:hover {
		text-decoration: underline;
	}

	.preview-content {
		margin-top: 1rem;
	}

	.preview-post {
		text-align: left;
	}

	/* Minimal default styles for preview - allow custom CSS to override easily */
	.preview-post .post-card {
		margin-bottom: 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background-color: var(--color-bg);
		padding: 1.5rem;
	}

	.preview-post .post-text {
		margin-bottom: 1rem;
	}

	.preview-post .post-footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.btn {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		transition: background-color 0.15s;
		cursor: pointer;
		border: none;
		border-radius: var(--radius-md);
		padding: 0.5rem 1rem;
		font-weight: 500;
		font-size: 0.875rem;
		text-decoration: none;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background-color: var(--color-accent);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--color-accent-hover);
	}

	.btn-secondary {
		border: 1px solid var(--color-border);
		background-color: var(--color-bg);
		color: var(--color-text);
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: var(--color-bg-elevated);
	}

	.btn-danger {
		border: 1px solid #ef4444;
		background-color: #fee2e2;
		color: #991b1b;
	}

	.btn-danger:hover:not(:disabled) {
		background-color: #fecaca;
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

	.confirm-card {
		margin-bottom: 1rem;
		border: 1px solid #ef4444;
		border-radius: var(--radius-md);
		background-color: #fee2e2;
		padding: 1.5rem;
	}

	.confirm-card h3 {
		margin: 0 0 0.5rem 0;
		color: #991b1b;
		font-weight: 600;
		font-size: 1.125rem;
	}

	.confirm-card p {
		margin: 0 0 1rem 0;
		color: #991b1b;
		font-size: 0.875rem;
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}
</style>
