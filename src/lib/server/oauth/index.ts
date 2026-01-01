/**
 * ATProto OAuth client configuration
 *
 * initializes OAuth client with identity resolution for handles and DIDs.
 * requires HTTPS public URL for security (ATProto OAuth spec requirement).
 */
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
 * retrieves or initializes OAuth client instance
 *
 * configures client metadata endpoints (jwks, callback, metadata) using OAUTH_PUBLIC_URL.
 * sets up identity resolution for both DNS and HTTP handle verification, plus PLC/web DID resolution.
 * returns null if OAUTH_PUBLIC_URL is not HTTPS (required by ATProto OAuth spec).
 *
 * @returns OAuth client instance or null if not properly configured
 * @throws if OAUTH_PRIVATE_KEY_JWK not set
 */
export const getOAuth = async (): Promise<OAuthClient | null> => {
	if (_oauth) {
		return _oauth;
	}

	// ATProto OAuth requires HTTPS for security
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
		// OAuth client metadata served at /oauth-client-metadata.json
		metadata: {
			client_id: new URL('/oauth-client-metadata.json', publicUrl).href,
			client_name: 'tumbsky',
			redirect_uris: [new URL('/oauth/callback', publicUrl).href],
			scope: 'atproto transition:generic',
			jwks_uri: new URL('/jwks.json', publicUrl).href,
		},

		keyset: await Promise.all([importJwkKey(env.OAUTH_PRIVATE_KEY_JWK)]),

		// identity resolution for handle→DID and DID document lookup
		actorResolver: new LocalActorResolver({
			handleResolver: new CompositeHandleResolver({
				methods: {
					dns: new NodeDnsHandleResolver(), // DNS TXT records
					http: new WellKnownHandleResolver(), // .well-known/atproto-did
				},
			}),
			didDocumentResolver: new CompositeDidDocumentResolver({
				methods: {
					plc: new PlcDidDocumentResolver(), // did:plc via plc.directory
					web: new WebDidDocumentResolver(), // did:web via HTTPS
				},
			}),
		}),

		stores, // database stores for state and session
	});

	return _oauth;
};
