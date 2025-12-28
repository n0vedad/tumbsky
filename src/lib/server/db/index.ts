import { env } from '$env/dynamic/private';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import * as schema from './schema';

// lazy initialization to avoid build-time errors
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
	if (_db) return _db;

	if (!env.DATABASE_URL) {
		throw new Error('DATABASE_URL is not set');
	}

	// create client with optional auth token for Turso
	const client = createClient({
		url: env.DATABASE_URL,
		...(env.TURSO_AUTH_TOKEN && { authToken: env.TURSO_AUTH_TOKEN }),
	});

	_db = drizzle(client, { schema });
	return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
	get(target, prop) {
		return getDb()[prop as keyof ReturnType<typeof drizzle>];
	},
});

export { schema };
