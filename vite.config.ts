/**
 * Vite configuration for SvelteKit
 *
 * binds to 0.0.0.0 for tunnel/reverse proxy access.
 * allowedHosts can be customized for your domain.
 */
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: '0.0.0.0', // bind to all interfaces for tunnel access
		strictPort: false,
		allowedHosts: ['.katerstrophal.world'], // customize for your domain
	},
});
