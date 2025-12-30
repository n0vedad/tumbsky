import { env } from '$env/dynamic/private';
import {
	CompositeDidDocumentResolver,
	CompositeHandleResolver,
	LocalActorResolver,
	PlcDidDocumentResolver,
	WebDidDocumentResolver,
	WellKnownHandleResolver,
} from '@atcute/identity-resolver';
import { NodeDnsHandleResolver } from '@atcute/identity-resolver-node';
import type { OAuthClient } from '@atcute/oauth-node-client';

import { stores } from './stores';

let _oauth: OAuthClient | null = null;

/**
 * get the OAuth client instance, initializing it if needed
 * @returns OAuth client or null if not configured
 */
export const getOAuth = async (): Promise<OAuthClient | null> => {
	if (_oauth) {
		return _oauth;
	}

	// OAuth node client requires https for security
	if (!env.OAUTH_PUBLIC_URL || !env.OAUTH_PUBLIC_URL.startsWith('https://')) {
		console.error('[OAuth] OAUTH_PUBLIC_URL check failed:', {
			value: env.OAUTH_PUBLIC_URL,
			isDefined: !!env.OAUTH_PUBLIC_URL,
			startsWithHttps: env.OAUTH_PUBLIC_URL?.startsWith('https://'),
		});
		return null;
	}

	if (!env.OAUTH_PRIVATE_KEY_JWK) {
		throw new Error(`OAUTH_PRIVATE_KEY_JWK is not set`);
	}

	const { OAuthClient, importJwkKey } = await import('@atcute/oauth-node-client');

	const publicUrl = new URL(env.OAUTH_PUBLIC_URL);

	_oauth = new OAuthClient({
		metadata: {
			client_id: new URL('/oauth-client-metadata.json', publicUrl).href,
			client_name: 'tumbsky',
			redirect_uris: [new URL('/oauth/callback', publicUrl).href],
			scope: 'atproto transition:generic',
			jwks_uri: new URL('/jwks.json', publicUrl).href,
		},

		keyset: await Promise.all([importJwkKey(env.OAUTH_PRIVATE_KEY_JWK)]),

		actorResolver: new LocalActorResolver({
			handleResolver: new CompositeHandleResolver({
				methods: {
					dns: new NodeDnsHandleResolver(),
					http: new WellKnownHandleResolver(),
				},
			}),
			didDocumentResolver: new CompositeDidDocumentResolver({
				methods: {
					plc: new PlcDidDocumentResolver(),
					web: new WebDidDocumentResolver(),
				},
			}),
		}),

		stores,
	});

	return _oauth;
};
