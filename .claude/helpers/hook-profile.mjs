/**
 * hook-profile.mjs — runtime gate for advisory hooks.
 *
 * Replaces ad-hoc DISABLED_TOKEN_REDUX_2026_04_23 markers with a single
 * environment-variable knob:
 *
 *   PRISM_HOOK_PROFILE=minimal | standard | strict   (default: standard)
 *   PRISM_DISABLED_HOOKS=hookA,hookB                  (comma-separated explicit disables)
 *
 * Profile semantics:
 *   - minimal:  only hard-block / safety-critical hooks fire (everything in MINIMAL_ALLOWLIST)
 *   - standard: current production behaviour — everything not explicitly disabled
 *   - strict:   everything fires, including verbose advisory hooks
 *
 * Adopted from `everything-claude-code` ECC_HOOK_PROFILE pattern (MIT, 2026-04-27).
 *
 * Usage in a hook (.mjs):
 *   import { shouldSkipHook } from "../helpers/hook-profile.mjs";
 *   if (shouldSkipHook("my-hook-name")) { console.log(JSON.stringify({continue:true})); process.exit(0); }
 */

const VALID_PROFILES = new Set(["minimal", "standard", "strict"]);
const DEFAULT_PROFILE = "standard";

/**
 * Hooks that fire under `minimal` profile. These are correctness/safety enforcers
 * — never disable as a token-economy measure. Everything else is advisory and
 * skipped under `minimal`.
 */
const MINIMAL_ALLOWLIST = new Set([
  // Hard blocks
  "code-completeness-gate",
  "duplication-hard-block",
  "anti-pattern-detector",
  "test-legitimacy",
  "settings-json-addonly-guard",
  "ban-facade-patterns",
  "edit-old-string-verify",
  "file-claim-guard",
  // Self-awareness gates (cheap and load-bearing)
  "inventory-check-guard",
  "master-index-search-gate",
  "dedup-auto-invoke",
  "always-build-guard",
  "enforce-handoff-topic",
  // Universal review enforcement — must fire for every chat
  "scrutinize-before-stop",
  // MS0-U6 macro bulk-emit safety — blocks Stop on unapproved batches.
  // Operator approval gate is unconditional; profile cannot disable.
  "macro-bulk-emit-guard",
  // BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U5 coverage-floor gate — blocks Stop when
  // session changed blueprint extraction-path code without a fresh audit.
  // Spec-mandated MINIMAL_ALLOWLIST: cannot be silently suppressed under
  // PRISM_HOOK_PROFILE=minimal.
  "blueprint-coverage-floor-guard",
]);

function getProfile() {
  const raw = (process.env.PRISM_HOOK_PROFILE || DEFAULT_PROFILE).toLowerCase();
  return VALID_PROFILES.has(raw) ? raw : DEFAULT_PROFILE;
}

function getDisabledSet() {
  const raw = process.env.PRISM_DISABLED_HOOKS || "";
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
}

/**
 * Should this hook be skipped under the current profile?
 *
 * @param {string} hookName - Stable identifier matching the hook's metadata.id
 *                            (typically the basename of the .mjs file without extension)
 * @returns {boolean} true if the caller should early-exit with {continue:true}
 */
export function shouldSkipHook(hookName) {
  if (!hookName || typeof hookName !== "string") return false;
  const disabled = getDisabledSet();
  if (disabled.has(hookName)) return true;
  const profile = getProfile();
  if (profile === "strict" || profile === "standard") return false;
  // minimal: skip unless on allowlist
  return !MINIMAL_ALLOWLIST.has(hookName);
}

/**
 * Convenience wrapper for hooks: emit {continue:true} and exit if skipped.
 * Returns true when the hook was skipped (caller should early-return).
 *
 * @param {string} hookName
 * @returns {boolean}
 */
export function gateHook(hookName) {
  if (shouldSkipHook(hookName)) {
    console.log(JSON.stringify({ continue: true }));
    return true;
  }
  return false;
}

/**
 * Diagnostic: returns the active profile and disable list.
 * Used by /hook-profile skill to report state.
 *
 * @returns {{profile: string, disabled: string[], allowlist: string[]}}
 */
export function getHookProfileState() {
  return {
    profile: getProfile(),
    disabled: [...getDisabledSet()],
    allowlist: [...MINIMAL_ALLOWLIST],
  };
}
