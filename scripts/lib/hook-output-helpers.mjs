// scripts/lib/hook-output-helpers.mjs
// -----------------------------------
// TOKEN-SAVINGS-EXPAND/U-PSN-HOOK-HELPERS (H1+H2+H3, 2026-05-23, slot:alpha)
//
// Shared utilities for hook output management:
//   H1 — capAdditionalContext(text, maxBytes): cap nudge text with truncation marker
//   H2 — shouldFireNoop(toolName, eligibleTools): cheap pre-check to skip non-eligible
//   H3 — runtime gate reminder doc (see PRISM_HOOK_PROFILE memo)
//
// Why: every PreToolUse/PostToolUse hook emitting additionalContext on every
// tool call burns context. Long blocks compound — 500-byte nudge × 200
// fires = 100KB of injected context across a session. The cap caps each
// fire; the noop-skip cuts the fire-rate.

// H1 — cap with truncation marker. Default 2KB (≈500 tokens).
export const DEFAULT_CAP_BYTES = 2048;

export function capAdditionalContext(text, maxBytes = DEFAULT_CAP_BYTES) {
  if (typeof text !== "string") return "";
  if (text.length <= maxBytes) return text;
  const marker = `\n…\n_[Hook output truncated at ${maxBytes} bytes for token economy]_`;
  const room = Math.max(0, maxBytes - marker.length);
  return text.slice(0, room) + marker;
}

// H2 — cheap eligibility pre-check. Returns true if hook should proceed.
// Hooks that fire on every PreToolUse should use this to short-circuit
// before any IO. Eligible tools = an array OR a Set.
export function shouldFireNoop(toolName, eligibleTools) {
  if (typeof toolName !== "string" || !toolName) return false;
  if (Array.isArray(eligibleTools)) return eligibleTools.includes(toolName);
  if (eligibleTools instanceof Set) return eligibleTools.has(toolName);
  return false;
}

// H3 — emit a one-line PRISM_HOOK_PROFILE awareness reminder for hook authors.
// Returns a comment string suitable for top-of-file documentation; the
// actual gating must be done by the hook itself via the canonical helper:
//   import { shouldSkipHook } from "../helpers/hook-profile.mjs";
//   if (shouldSkipHook("<hook-name>")) { pass(); return; }
export function hookProfileReminder() {
  return "// HOOK-PROFILE: This hook should check shouldSkipHook(<name>) from helpers/hook-profile.mjs at top of main() to respect PRISM_HOOK_PROFILE runtime gate.";
}
