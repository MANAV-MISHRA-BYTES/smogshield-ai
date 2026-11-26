/**
 * Input sanitization utilities to harden user-supplied text before validation and LLM prompting.
 */

const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const ROLE_SPOOF_REGEX = /(?:^|\n)\s*(system|assistant|developer|instruction)\s*:/gi;
const DELIMITER_REGEX = /<\|[^|]*\|>|```+/g;

/**
 * Sanitizes free-form user text by removing control characters, LLM delimiter tokens,
 * and excessive whitespace while capping maximum length.
 *
 * @param raw - Untrusted user input string.
 * @param maxLength - Maximum allowed output character length.
 * @returns Sanitized plain text string.
 */
export function sanitizeUserText(raw: string, maxLength = 500): string {
  const withoutControls = raw
    .replace(CONTROL_CHAR_REGEX, "")
    .replace(DELIMITER_REGEX, " ")
    .replace(ROLE_SPOOF_REGEX, "\nNote:")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (withoutControls.length <= maxLength) {
    return withoutControls;
  }

  return withoutControls.slice(0, maxLength).trim();
}

/**
 * Sanitizes city search queries to safe printable characters only.
 *
 * @param raw - Untrusted city query parameter.
 * @param maxLength - Maximum query length.
 * @returns Clean city query string.
 */
export function sanitizeSearchQuery(raw: string, maxLength = 80): string {
  return raw
    .replace(CONTROL_CHAR_REGEX, "")
    .replace(/[^\p{L}\p{N}\s,.'-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxLength);
}
