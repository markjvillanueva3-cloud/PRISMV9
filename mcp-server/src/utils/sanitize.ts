/**
 * Input Sanitization Utilities
 *
 * Strips HTML, prevents XSS, enforces max length.
 * Apply to all user-facing text inputs.
 *
 * @version 1.0.0 — L2-B3 Input Validation Hardening
 */

const HTML_TAG_RE = /<[^>]*>/g;
const SCRIPT_RE = /javascript:|on\w+\s*=|<script|<\/script|eval\s*\(|expression\s*\(/gi;
const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;

/**
 * Sanitize user text input.
 * - Strips HTML tags
 * - Rejects script/event handler injection
 * - Removes control characters
 * - Enforces max length
 * - Trims whitespace
 *
 * @throws Error if text contains script injection patterns
 */
export function sanitizeText(input: unknown, maxLength = 500): string {
  if (input == null) return "";
  const raw = String(input);

  // Reject obvious injection attempts
  if (SCRIPT_RE.test(raw)) {
    throw new Error("Input contains disallowed patterns (script/event handler injection)");
  }

  // Strip HTML tags
  let clean = raw.replace(HTML_TAG_RE, "");

  // Remove control characters (keep newline, tab, carriage return)
  clean = clean.replace(CONTROL_CHAR_RE, "");

  // Trim and enforce max length
  clean = clean.trim();
  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength);
  }

  return clean;
}

/**
 * Sanitize a full object's string fields recursively.
 * Non-string values are passed through unchanged.
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  maxLength = 500,
  depth = 0
): T {
  if (depth > 5 || obj == null || typeof obj !== "object") return obj;

  const result: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeText(value, maxLength);
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitizeObject(value, maxLength, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}
