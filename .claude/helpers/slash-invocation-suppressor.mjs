#!/usr/bin/env node
/**
 * slash-invocation-suppressor.mjs — shared guard for token-heavy auto-injectors.
 *
 * SLOT-DRIFT-FIX-MS0/U-SDF08 (2026-05-17). Sister to meta-task-suppressor.mjs.
 *
 * Problem: per-prompt injection hooks (`discipline-expert-inject`,
 * `comprehensive-build-enforce`, `chat-bus-inject`, etc.) emit hundreds-of-
 * tokens directives on EVERY UserPromptSubmit. When the operator invokes
 * a pure slash command (`/checkin-bravo`, `/loop`, `/handoff`, etc.) the
 * model is invoking PRISM machinery — not asking a domain question — so
 * the PhD-expert / build-enforcement / live-fleet boilerplate is pure
 * token waste.
 *
 * This helper classifies prompts as PURE-SLASH-INVOCATION when:
 *   • The prompt starts with `/`  AND
 *   • After stripping all `/word[-word]*` tokens, the remainder is short
 *     (<30 chars by default)
 *
 * Examples (SUPPRESSED — pure invocation):
 *   "/checkin-bravo"
 *   "/checkin-bravo /loop"
 *   "/checkin-bravo /loop until /goal"
 *   "/precompact"  ·  "/handoff"  ·  "/clear"
 *
 * Examples (PASSES — substantive content):
 *   "/checkin-bravo build the user auth system with OAuth2"
 *   "/loop analyze the wire-edm milestone and pick next unit"
 *   "fix the broken slot binding system"
 *
 * USAGE (from a hook):
 *   import { isPureSlashInvocation } from "../helpers/slash-invocation-suppressor.mjs";
 *   if (isPureSlashInvocation(prompt).suppress) {
 *     console.log(JSON.stringify({ continue: true }));
 *     return;
 *   }
 *
 * Pure function. No I/O. Sub-ms.
 *
 * Knobs (env):
 *   PRISM_SLASH_SUPPRESS_DISABLE=1   — never suppress (always treat as substantive)
 *   PRISM_SLASH_SUPPRESS_MIN_CONTENT=N — change remainder threshold (default 30)
 */

const DEFAULT_MIN_CONTENT_CHARS = 30;

export function isPureSlashInvocation(prompt) {
  if (process.env.PRISM_SLASH_SUPPRESS_DISABLE === "1") {
    return { suppress: false, reason: "knob_disabled" };
  }
  if (typeof prompt !== "string" || prompt.length === 0) {
    return { suppress: false, reason: "empty_prompt" };
  }
  const trimmed = prompt.trim();
  if (!trimmed.startsWith("/")) {
    return { suppress: false, reason: "not_slash_prefixed" };
  }
  // Strip all /command tokens (slash followed by word chars / hyphens). Use
  // a global regex; leave non-slash content intact.
  const stripped = trimmed.replace(/\/[A-Za-z][\w-]*/g, "").trim();
  const threshold = Number(process.env.PRISM_SLASH_SUPPRESS_MIN_CONTENT)
    || DEFAULT_MIN_CONTENT_CHARS;
  if (stripped.length < threshold) {
    return {
      suppress: true,
      reason: "pure_slash_invocation",
      remainder: stripped,
      remainderLen: stripped.length,
    };
  }
  return {
    suppress: false,
    reason: "substantive_content_after_slash",
    remainder: stripped,
    remainderLen: stripped.length,
  };
}
