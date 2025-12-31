#!/usr/bin/env node
import { webcrypto } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const ENV_PATH = '.env';
const ENV_EXAMPLE_PATH = '.env.example';

async function generateOAuthKey() {
	const keyPair = await webcrypto.subtle.generateKey(
		{
			name: 'ECDSA',
			namedCurve: 'P-256',
		},
		true,
		['sign', 'verify'],
	);

	const jwk = await webcrypto.subtle.exportKey('jwk', keyPair.privateKey);
	jwk.kid = 'tumbsky-key';
	jwk.alg = 'ES256';
	return JSON.stringify(jwk);
}

async function generateCookieSecret() {
	const bytes = new Uint8Array(32);
	webcrypto.getRandomValues(bytes);
	return Buffer.from(bytes).toString('base64');
}

async function main() {
	let env = '';

	try {
		env = await readFile(ENV_PATH, 'utf8');
		console.log('✓ .env exists');
	} catch {
		console.log('✓ creating .env from .env.example');
		env = await readFile(ENV_EXAMPLE_PATH, 'utf8');
	}

	let modified = false;

	if (!env.match(/^OAUTH_PRIVATE_KEY_JWK=.+$/m)) {
		console.log('✓ generating OAUTH_PRIVATE_KEY_JWK');
		const key = await generateOAuthKey();
		env = env.replace(/^OAUTH_PRIVATE_KEY_JWK=.*$/m, `OAUTH_PRIVATE_KEY_JWK='${key}'`);
		modified = true;
	}

	if (!env.match(/^COOKIE_SECRET=.+$/m)) {
		console.log('✓ generating COOKIE_SECRET');
		const secret = await generateCookieSecret();
		env = env.replace(/^COOKIE_SECRET=.*$/m, `COOKIE_SECRET=${secret}`);
		modified = true;
	}

	if (modified) {
		await writeFile(ENV_PATH, env);
		console.log('✓ .env updated');
	}
}

main().catch((err) => {
	console.error('❌ failed:', err);
	process.exit(1);
});
