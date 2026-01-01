/**
 * Tap/Firehose subscription management
 *
 * subscribes to ATProto Firehose for real-time post updates.
 * processes events via ingest.ts and acknowledges to advance cursor.
 */
import type { TapClient } from '@atcute/tap';

import { ingestTapEvent } from './ingest';

/**
 * runs Tap subscription loop indefinitely
 *
 * subscribes to Firehose events and ingests them into database.
 * acknowledges each event to advance cursor (prevents re-processing on restart).
 * runs until process exits or connection fails.
 *
 * @param tap configured Tap client instance
 */
export const runTapSubscription = async (tap: TapClient): Promise<void> => {
	for await (const { event, ack } of tap.subscribe()) {
		await ingestTapEvent(event);
		await ack(); // advance cursor after successful processing
	}
};
