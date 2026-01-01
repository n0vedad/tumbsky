/**
 * Drizzle ORM database client with lazy initialization
 *
 * uses Proxy pattern to defer database connection until first access.
 * supports both local SQLite and Turso (libSQL) via DATABASE_URL scheme.
 */
import { env } from '$env/dynamic/private';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import * as schema from './schema';

// lazy initialization to avoid build-time errors when env vars aren't set
let _db: ReturnType<typeof drizzle> | null = null;

/**
 * initializes database connection on first access
 *
 * supports local SQLite (file:local.db) and Turso (libsql://...).
 * Turso requires TURSO_AUTH_TOKEN for authentication.
 *
 * @returns Drizzle database instance
 * @throws if DATABASE_URL not set
 */
function getDb() {
	if (_db) return _db;

	if (!env.DATABASE_URL) {
		throw new Error('DATABASE_URL is not set');
	}

	// create libSQL client with optional Turso auth token
	const client = createClient({
		url: env.DATABASE_URL,
		...(env.TURSO_AUTH_TOKEN && { authToken: env.TURSO_AUTH_TOKEN }),
	});

	_db = drizzle(client, { schema });
	return _db;
}

/**
 * database client proxy that lazily initializes on first property access
 *
 * allows importing `db` at module level without triggering connection.
 * actual connection only happens when db.query/db.insert/etc are called.
 */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
	get(target, prop) {
		return getDb()[prop as keyof ReturnType<typeof drizzle>];
	},
});

export { schema };
