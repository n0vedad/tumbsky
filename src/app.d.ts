/**
 * SvelteKit global type definitions
 *
 * extends App.Locals with session and auth context, making them available
 * in all server-side code via event.locals
 */
import type { AuthContext } from '$lib/server/auth';

declare global {
	namespace App {
		interface Locals {
			// cached OAuth client with session (set by requireAuth())
			auth?: AuthContext;
			// minimal session data from signed cookie (set by hooks.server.ts)
			session?: { did: `did:${string}:${string}` };
		}
	}
}

export {};
