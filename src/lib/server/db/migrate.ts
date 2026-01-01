/**
 * database migration runner
 *
 * runs drizzle migrations on application startup.
 */
import { migrate } from 'drizzle-orm/libsql/migrator';

import { db } from './index';

/**
 * runs all pending database migrations
 */
export async function runMigrations(): Promise<void> {
	try {
		await migrate(db, { migrationsFolder: './drizzle' });
		console.log('Database migrations applied successfully');
	} catch (err) {
		console.error('Migration error:', err);
		throw err;
	}
}
