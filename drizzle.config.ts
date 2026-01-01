/**
 * Drizzle Kit configuration for database migrations
 *
 * supports both local SQLite (file:local.db) and Turso (libsql://).
 * Turso requires TURSO_AUTH_TOKEN env var for remote databases.
 */
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set');
}

// detect Turso vs local SQLite by URL scheme
const dbCredentials = process.env.DATABASE_URL.startsWith('libsql://')
	? {
			url: process.env.DATABASE_URL,
			authToken: process.env.TURSO_AUTH_TOKEN,
		}
	: { url: process.env.DATABASE_URL };

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	dbCredentials,
	verbose: true,
	strict: true,
});
