import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set');
}

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
