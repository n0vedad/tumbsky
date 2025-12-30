import postcss from 'postcss';
// @ts-expect-error - no types available for postcss-safe-parser
import safeParser from 'postcss-safe-parser';

/**
 * list of dangerous CSS properties that should be blocked
 */
const BLOCKED_PROPERTIES = new Set([
	'behavior',
	'-moz-binding',
	'binding',
	'link',
	'filter',
]);

/**
 * list of dangerous CSS functions that should be blocked
 */
const BLOCKED_FUNCTIONS = [
	'expression',
	'javascript',
	'vbscript',
	'import',
	'url-prefix',
	'domain',
];

/**
 * list of allowed at-rules
 */
const ALLOWED_AT_RULES = new Set(['media', 'supports', 'keyframes', 'font-face', 'container']);

/**
 * validates if a CSS value is safe
 * @param value CSS property value
 * @returns true if safe, false otherwise
 */
function isValueSafe(value: string): boolean {
	const lowerValue = value.toLowerCase();

	// check for dangerous functions
	for (const func of BLOCKED_FUNCTIONS) {
		if (lowerValue.includes(func + '(')) {
			return false;
		}
	}

	// check for javascript: protocol
	if (lowerValue.includes('javascript:')) {
		return false;
	}

	// check for data: URLs with scripts
	if (lowerValue.includes('data:') && lowerValue.includes('script')) {
		return false;
	}

	return true;
}

/**
 * sanitizes CSS to prevent XSS attacks
 * @param css user-provided CSS string
 * @returns sanitized CSS or null if invalid
 */
export async function sanitizeCSS(css: string): Promise<string | null> {
	if (!css || typeof css !== 'string') {
		return null;
	}

	// trim and check length (max 100KB)
	const trimmed = css.trim();
	if (trimmed.length === 0) {
		return null;
	}
	if (trimmed.length > 100 * 1024) {
		throw new Error('CSS exceeds maximum size of 100KB');
	}

	try {
		// parse CSS with safe parser (doesn't throw on invalid CSS)
		// @ts-expect-error - parser option exists but is not in types
		const root = postcss.parse(trimmed, { parser: safeParser });

		// walk through all nodes and sanitize
		root.walkAtRules((rule) => {
			// remove disallowed at-rules
			if (!ALLOWED_AT_RULES.has(rule.name.toLowerCase())) {
				rule.remove();
				return;
			}

			// block @import specifically
			if (rule.name.toLowerCase() === 'import') {
				rule.remove();
			}
		});

		root.walkDecls((decl) => {
			const prop = decl.prop.toLowerCase();
			const value = decl.value;

			// remove blocked properties
			if (BLOCKED_PROPERTIES.has(prop)) {
				decl.remove();
				return;
			}

			// check if value is safe
			if (!isValueSafe(value)) {
				decl.remove();
				return;
			}

			// remove !important from position: fixed/absolute to prevent overlay attacks
			if (prop === 'position' && (value === 'fixed' || value === 'absolute')) {
				if (decl.important) {
					decl.important = false;
				}
			}
		});

		// remove comments (could contain injection attempts)
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
 * @param css user-provided CSS string
 * @returns validation result with errors
 */
export async function validateCSS(
	css: string,
): Promise<{ valid: boolean; errors: string[] }> {
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
