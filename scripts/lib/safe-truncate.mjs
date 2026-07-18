/**
 * safe-truncate.mjs -- UTF-8 + UTF-16-surrogate-safe string truncation + a
 * lone-surrogate sanitizer for anything that lands in a hook's injected
 * additionalContext (or any JSON body sent to an API).
 *
 * WHY (2026-06-10, slot:golf): a peer chat (bravo) hard-blocked with
 *   400 "The request body is not valid JSON: no low surrogate in string"
 * Root cause class: an injector did a naive `str.slice(0, N)` on emoji-heavy
 * content. `.slice` cuts at a UTF-16 code-unit boundary, so when N lands
 * BETWEEN the two halves of a surrogate pair (mid-emoji), it leaves a LONE
 * high surrogate. That unpaired surrogate is invalid in a JSON string and the
 * Anthropic API rejects the whole request. `galaxy-context-card.mjs` already
 * solved this locally (clampUtf8/utf8Truncate); this promotes that proven logic
 * to a shared lib so every injector uses ONE surrogate-safe truncator instead
 * of re-deriving (or skipping) the guard. Apply-to-all-galaxies (R15).
 *
 * @module scripts/lib/safe-truncate
 */

/**
 * Replace every UNPAIRED UTF-16 surrogate with U+FFFD so the string is
 * well-formed and JSON-serializable. Valid surrogate PAIRS (real emoji/astral
 * chars) are preserved untouched. Idempotent.
 *
 * @param {string} s
 * @returns {string} well-formed string (no lone surrogates)
 */
export function stripLoneSurrogates(s) {
  if (typeof s !== "string" || s.length === 0) return s;
  // Node 20+ / ES2024 built-in does exactly this (lone surrogate -> U+FFFD).
  if (typeof s.toWellFormed === "function") return s.toWellFormed();
  return stripLoneSurrogatesFallback(s);
}

/**
 * Pre-ES2024 fallback for {@link stripLoneSurrogates} (runtimes without
 * `String.prototype.toWellFormed`). Exported so the fallback can be tested
 * directly on a modern runtime.
 *
 * Uses non-consuming lookahead/lookbehind so CONSECUTIVE lone surrogates are
 * EACH replaced. (A consuming match -- e.g. `(^|[^high])(low)` -- eats the char
 * before a lone low, so a second adjacent lone low would be skipped and leak;
 * the lookbehind form mirrors `hasLoneSurrogate` and avoids that.)
 *
 * @param {string} s
 * @returns {string}
 */
export function stripLoneSurrogatesFallback(s) {
  if (typeof s !== "string" || s.length === 0) return s;
  const FFFD = String.fromCharCode(0xfffd);
  return s
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, FFFD)   // lone high (no low after)
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, FFFD); // lone low (no high before) -- lookbehind, non-consuming
}

/**
 * True if the string contains at least one unpaired surrogate (would break a
 * JSON request body). Cheap predicate for diagnostics/guards.
 *
 * @param {string} s
 * @returns {boolean}
 */
export function hasLoneSurrogate(s) {
  if (typeof s !== "string" || s.length === 0) return false;
  return /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);
}

/**
 * Slice a string to a UTF-8 BYTE budget without splitting a multibyte char or a
 * surrogate pair. Never returns a lone high surrogate at the tail. (Canonical
 * impl promoted from galaxy-context-card.mjs.)
 *
 * @param {string} s
 * @param {number} maxBytes
 * @returns {string}
 */
export function clampUtf8(s, maxBytes) {
  if (typeof s !== "string") s = String(s ?? "");
  if (maxBytes <= 0) return "";
  if (Buffer.byteLength(s, "utf8") <= maxBytes) return s;
  let end = Math.min(s.length, maxBytes);
  while (end > 0 && Buffer.byteLength(s.slice(0, end), "utf8") > maxBytes) end--;
  // never end on a lone high surrogate (its low half is at index `end`, excluded)
  if (end > 0) { const c = s.charCodeAt(end - 1); if (c >= 0xd800 && c <= 0xdbff) end--; }
  return s.slice(0, end);
}

/**
 * Truncate to a UTF-8 byte budget, appending `marker` when truncated. ALWAYS
 * returns <= maxBytes bytes (marker included) and is multibyte + surrogate-pair
 * safe. Returns { text, truncated }.
 *
 * @param {string} str
 * @param {number} maxBytes
 * @param {string} [marker]
 * @returns {{ text: string, truncated: boolean }}
 */
export function utf8Truncate(str, maxBytes, marker = "\n...[truncated]") {
  const s = typeof str === "string" ? str : String(str ?? "");
  if (Buffer.byteLength(s, "utf8") <= maxBytes) return { text: s, truncated: false };
  const budget = maxBytes - Buffer.byteLength(marker, "utf8");
  if (budget <= 0) return { text: clampUtf8(marker, Math.max(0, maxBytes)), truncated: true };
  return { text: clampUtf8(s, budget).replace(/\s+$/, "") + marker, truncated: true };
}

/**
 * Truncate to at most `maxUnits` UTF-16 code units WITHOUT splitting a surrogate
 * pair (drops a trailing lone high surrogate), then append `suffix`. For
 * callers that budget in code units (`.length`) rather than bytes.
 *
 * @param {string} s
 * @param {number} maxUnits
 * @param {string} [suffix]
 * @returns {string}
 */
export function safeTruncate(s, maxUnits, suffix = "") {
  if (typeof s !== "string") s = String(s ?? "");
  if (s.length <= maxUnits) return s;
  let end = Math.max(0, maxUnits);
  const c = s.charCodeAt(end - 1);
  if (c >= 0xd800 && c <= 0xdbff) end--; // last kept unit is a high surrogate -> drop it
  return s.slice(0, end) + suffix;
}
