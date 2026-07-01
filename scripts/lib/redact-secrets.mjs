// scripts/lib/redact-secrets.mjs
//
// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / FOUNDATION-HARDEN — shared secret redactor.
//
// Extracted from zulu-telegram-bridge.mjs's sanitizeOutput so there is ONE
// redactor the fleet shares (the bridge now delegates its token/JWT/env/hex
// masking here). Used by:
//   - octopus-corpus-loader.mjs  — masks every PSN snippet BEFORE it reaches an
//     external multi-model voice (gemini/grok) or the shared-branch ledger.
//   - octopus-record-lib.mjs     — defensive second pass on psnExemplars.
//   - zulu-telegram-bridge.mjs    — outbound phone-reply sanitizer (adds its own
//     absolute-path masking + length cap around this core).
//
// Defense-in-depth: the corpora/brain return filenames + snippets that may
// inadvertently quote a key/token; this guarantees no bearer token, vendor API
// key, JWT, generic api_key:/secret:/token:/password: line, or long hex blob
// crosses the trust boundary.
//
// Pure + deterministic. Never throws — non-string input coerces to "".
//
// Karpathy discipline:
//   CLASSIFY: string-rewrite / pattern-mask
//   TECHNIQUE: ordered regex replace, most-specific (JWT/vendor key) before
//     least-specific (long hex) so a JWT isn't half-eaten by the hex rule
//   EDGE CASES: null/number/object input, empty string, key embedded mid-line,
//     frontmatter at top of snippet, multiple secrets on one line
//   FAILURE MODES: none escape — every branch returns a string

// Leaking YAML frontmatter keys auto-emitted by the memory/wiki generators.
// These expose internal source paths / content hashes / generator provenance
// that must never reach an external voice or the shared ledger.
const FRONTMATTER_LEAK_KEYS = ["source_path", "content_hash", "slug", "generator", "generated_at"];

/**
 * Mask secrets + leaking provenance keys in a free-text snippet.
 * @param {*} text — coerced to string; non-string → "".
 * @returns {string} the redacted text (same shape, masked spans).
 */
export function redactSecrets(text) {
  let out = typeof text === "string" ? text : (text == null ? "" : String(text));
  if (out.length === 0) return out;

  out = out
    // --- bearer / vendor API keys (most specific first) ---
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    // Google API key — AIza + 35 url-safe chars (match ≥20 to be safe)
    .replace(/AIza[0-9A-Za-z_\-]{20,}/g, "[redacted-google-key]")
    // OpenAI-style secret key
    .replace(/\bsk-\S+/g, "[redacted-openai-key]")
    // xAI (grok) key
    .replace(/\bxai-\S+/g, "[redacted-xai-key]")
    // GitHub fine-grained + classic personal access tokens
    .replace(/\bgithub_pat_\S+/g, "[redacted-github-pat]")
    .replace(/\bghp_\S+/g, "[redacted-github-token]")
    // JWT (three base64url segments) — before the long-hex rule
    .replace(/\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g, "[redacted-jwt]")
    // --- generic credential assignment lines (api_key=, secret:, token =, password:) ---
    // Masks the VALUE after the separator; keeps the key name for readability.
    .replace(
      /\b(api[_-]?key|secret|token|password)(\s*[:=]\s*)(\S+)/gi,
      (_m, key, sep, _val) => `${key}${sep}[redacted-secret]`,
    )
    // --- long hex runs (token/hash blobs) — least specific, last ---
    // Case-insensitive: an all-uppercase hex blob is just as much a token/hash
    // as a lowercase one (preserves the bridge's original [A-Fa-f0-9] coverage).
    .replace(/\b[0-9a-fA-F]{32,}\b/g, "[redacted-hex]")
    // --- private home path: mask the OS username after Users/ or home/ (privacy) ---
    // Docs/snippets quote C:/Users/<name>/... (or /home/<name>/...) which would leak the
    // Windows/Unix username to an external voice. Keep the prefix for readability, mask the
    // user segment only. Handles both slash styles.
    .replace(
      /([A-Za-z]:[\\/]Users[\\/]|[\\/](?:home|Users)[\\/])([^\\/\s"';,)\]]+)/gi,
      (_m, lead) => `${lead}[user]`,
    );

  // --- strip leaking YAML frontmatter keys (any line `key: value`) ---
  for (const key of FRONTMATTER_LEAK_KEYS) {
    // Whole-line match (multiline) — drops the value, neutralises the key.
    const re = new RegExp(`(^|\\n)[ \\t]*${key}\\s*:[^\\n]*`, "gi");
    out = out.replace(re, (_m, lead) => `${lead}${key}: [redacted]`);
  }

  return out;
}

export { FRONTMATTER_LEAK_KEYS };
