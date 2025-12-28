import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: '0.0.0.0', // bind to all interfaces explicitly
		strictPort: false,
		allowedHosts: ['.katerstrophal.world'],
	},
});
