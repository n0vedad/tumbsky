/**
 * SvelteKit configuration
 *
 * uses adapter-node for Railway/Node.js deployment.
 * remoteFunctions enables server-side form actions in .remote.ts files.
 * experimental async compiler improves server-side rendering performance.
 */
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	compilerOptions: {
		experimental: {
			// async compiler for better SSR performance
			async: true,
		},
	},

	kit: {
		// adapter-node for Railway/Node.js deployment
		adapter: adapter(),
		experimental: {
			// enables *.remote.ts server-side form actions
			remoteFunctions: true,
		},
	},
};

export default config;
