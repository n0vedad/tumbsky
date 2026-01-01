/**
 * @atcute/lex-cli configuration for ATProto lexicon code generation
 *
 * currently unused - Tumbsky uses standard Bluesky lexicons only.
 * kept for potential future custom lexicon support.
 */
import { defineLexiconConfig } from '@atcute/lex-cli';

export default defineLexiconConfig({
	files: ['lexicons/**/*.json'],
	outdir: 'src/lib/lexicons/',
});
