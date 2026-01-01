/**
 * CSS sanitization to prevent XSS attacks
 *
 * blocks dangerous CSS features (IE behaviors, javascript: URLs, expression()).
 * uses postcss-safe-parser to handle malicious input gracefully.
 * removes !important from position:fixed/absolute to prevent UI overlay attacks.
 */
import postcss from 'postcss';
// @ts-expect-error - no types available for postcss-safe-parser
import safeParser from 'postcss-safe-parser';

/**
 * CSS properties blocked for security
 *
 * behavior/binding: IE-specific features that can execute code
 * filter: old IE filter syntax with security issues
 */
const BLOCKED_PROPERTIES = new Set(['behavior', '-moz-binding', 'binding', 'link', 'filter']);

/**
 * CSS functions blocked for security
 *
 * expression(): IE-specific JavaScript execution
 * javascript:/vbscript:: protocol-based XSS
 * import: can load external stylesheets with bypasses
 */
const BLOCKED_FUNCTIONS = ['expression', 'javascript', 'vbscript', 'import', 'url-prefix', 'domain'];

/**
 * at-rules allowed in user CSS
 *
 * permits styling features (media queries, animations, fonts) while blocking
 * dangerous at-rules like @import that could load external content.
 */
const ALLOWED_AT_RULES = new Set(['media', 'supports', 'keyframes', 'font-face', 'container']);

/**
 * checks if CSS value contains dangerous functions or protocols
 *
 * detects javascript: URLs, IE expression() functions, and data: URLs with scripts.
 * case-insensitive to catch obfuscation attempts.
 *
 * @param value CSS property value to validate
 * @returns true if safe, false if contains dangerous content
 */
function isValueSafe(value: string): boolean {
	const lowerValue = value.toLowerCase();

	// check for dangerous CSS functions
	for (const func of BLOCKED_FUNCTIONS) {
		if (lowerValue.includes(func + '(')) {
			return false;
		}
	}

	// check for javascript: protocol
	if (lowerValue.includes('javascript:')) {
		return false;
	}

	// check for data: URLs with embedded scripts
	if (lowerValue.includes('data:') && lowerValue.includes('script')) {
		return false;
	}

	return true;
}

/**
 * sanitizes user-provided CSS to prevent XSS attacks
 *
 * uses postcss-safe-parser to handle malicious input gracefully. blocks IE-specific
 * properties, javascript: URLs, and unsafe CSS functions. 100KB size limit to prevent DoS.
 * removes !important from position fixed/absolute to prevent UI overlay attacks.
 *
 * @param css raw user CSS
 * @returns sanitized CSS or null if invalid
 * @throws if CSS is too large (>100KB)
 */
export async function sanitizeCSS(css: string): Promise<string | null> {
	if (!css || typeof css !== 'string') {
		return null;
	}

	const trimmed = css.trim();
	if (trimmed.length === 0) {
		return null;
	}
	if (trimmed.length > 100 * 1024) {
		throw new Error('CSS exceeds maximum size of 100KB');
	}

	try {
		// postcss-safe-parser handles malicious/broken CSS gracefully
		// @ts-expect-error - parser option exists but is not in types
		const root = postcss.parse(trimmed, { parser: safeParser });

		// remove dangerous at-rules (@import, etc.)
		root.walkAtRules((rule) => {
			if (!ALLOWED_AT_RULES.has(rule.name.toLowerCase())) {
				rule.remove();
				return;
			}

			// double-check @import is blocked (redundant but explicit)
			if (rule.name.toLowerCase() === 'import') {
				rule.remove();
			}
		});

		// sanitize CSS declarations
		root.walkDecls((decl) => {
			const prop = decl.prop.toLowerCase();
			const value = decl.value;

			// remove IE behaviors and other dangerous properties
			if (BLOCKED_PROPERTIES.has(prop)) {
				decl.remove();
				return;
			}

			// remove declarations with unsafe values
			if (!isValueSafe(value)) {
				decl.remove();
				return;
			}

			// strip !important from position fixed/absolute to prevent UI overlays
			if (prop === 'position' && (value === 'fixed' || value === 'absolute')) {
				if (decl.important) {
					decl.important = false;
				}
			}
		});

		// remove comments (potential injection vectors)
		root.walkComments((comment) => {
			comment.remove();
		});

		return root.toString();
	} catch (error) {
		console.error('CSS sanitization error:', error);
		throw new Error('invalid CSS syntax');
	}
}

/**
 * validates CSS without modifying it
 *
 * wrapper around sanitizeCSS for validation-only use cases.
 * returns structured error information.
 *
 * @param css user-provided CSS string
 * @returns validation result with errors array
 */
export async function validateCSS(css: string): Promise<{ valid: boolean; errors: string[] }> {
	const errors: string[] = [];

	if (!css || typeof css !== 'string') {
		return { valid: false, errors: ['CSS must be a non-empty string'] };
	}

	if (css.length > 100 * 1024) {
		return { valid: false, errors: ['CSS exceeds maximum size of 100KB'] };
	}

	try {
		await sanitizeCSS(css);
		return { valid: true, errors: [] };
	} catch (error) {
		errors.push(error instanceof Error ? error.message : 'unknown error');
		return { valid: false, errors };
	}
}
