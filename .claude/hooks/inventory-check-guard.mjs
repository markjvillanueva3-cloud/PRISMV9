#!/usr/bin/env node
// tier: T2
/**
 * inventory-check-guard.mjs — UserPromptSubmit hook (U-AWARE02, refactored H9 + saturation arm).
 *
 * Detects build/create/audit intent in user messages and injects current
 * PRISM inventory counts as mandatory context. When the user is asking to
 * create assets in a saturated category, emit a saturation warning per the
 * U-AWARE02 spec's third deliverable.
 *
 * H9 changes (from pre-H9 form):
 *   • Fixed phantom `readStdinSafe()` call (the function never existed —
 *     the original swallowed a ReferenceError silently every fire, which
 *     meant the inventory line *never* actually injected).
 *   • Reduced to a strict shim shape.
 *
 * 2026-05-13 (U-AWARE02 close-out): added saturation-category warning so
 * the third deliverable line ("Warning if creating in saturated category")
 * is honest. Thresholds derived from BASELINE_INVENTORY.json watermarks at
 * commit time; tune by editing `SATURATION_THRESHOLDS`.
 *
 * Triggers: build, create, implement, audit, investigate, /forge, /dedup.
 */

import { readFileSync } from "node:fs";

const INVENTORY_PATH = "H:/prism/mcp-server/data/state/BASELINE_INVENTORY.json";

const BUILD_PATTERNS = [
  /\b(build|create|implement|add|write|make|develop)\b.*\b(engine|algorithm|hook|skill|dispatcher|feature|system)\b/i,
  /\bnew\s+(engine|algorithm|hook|skill|dispatcher|feature)\b/i,
  /\b(audit|investigate|analyze|review|check)\b.*\b(code|system|engine|architecture)\b/i,
  /\/forge/i,
  /\/dedup/i,
];

// Saturation warning is keyed to CREATE intent specifically (not audit/review/
// investigate), because the warning text ("consider extending an existing
// asset before creating") only makes sense for prompts that propose new
// assets. A reader asking "audit engines" should NOT be steered away from
// looking at the inventory.
export const CREATE_PATTERNS = [
  /\b(build|create|implement|add|write|make|develop|forge)\b.*\b(engine|algorithm|hook|skill|dispatcher|feature|system|action)\b/i,
  /\bnew\s+(engine|algorithm|hook|skill|dispatcher|feature|action)\b/i,
  /\/forge/i,
];

/**
 * True when the prompt expresses intent to CREATE a new asset (not just
 * audit/inspect an existing one). The saturation warning only fires when
 * this is true — see the codex 3-of-3 review of 455d3367b.
 * @param {string} message normalized user prompt
 * @returns {boolean}
 */
export function hasCreateIntent(message) {
  if (typeof message !== "string" || message.length === 0) return false;
  return CREATE_PATTERNS.some((p) => p.test(message));
}

// Saturation watermarks — categories with counts above these are considered
// saturated and any "create X" intent receives a hard look-twice warning.
// Numbers are 10% above the BASELINE_INVENTORY.json values at the time of
// U-AWARE02 close-out (2026-05-13). Tune as the platform grows.
export const SATURATION_THRESHOLDS = Object.freeze({
  engines: 3000,
  dispatchers: 100,
  actions: 7500,
  algorithms: 25,
  hooks_registry: 70,
  skills: 500,
});

// Map saturation category → keyword(s) in the user prompt that signal intent
// to create that kind of asset. Keep regex bounded with word-boundaries to
// avoid false-positives on substrings ("engineering", "actionable", ...).
const CATEGORY_INTENT = Object.freeze([
  { key: "engines", re: /\bengines?\b/i },
  { key: "dispatchers", re: /\bdispatchers?\b/i },
  { key: "actions", re: /\baction(s)?\b/i },
  { key: "algorithms", re: /\balgorithms?\b/i },
  { key: "hooks_registry", re: /\bhooks?\b/i },
  { key: "skills", re: /\bskills?\b/i },
]);

/**
 * Inspect (inv, message) and return the list of saturated categories the
 * user appears to want to create assets in. Returns null when the user
 * intent doesn't match any saturated category — keeps the saturation arm
 * silent unless it has a concrete reason to fire.
 * @param {object|null} inv parsed BASELINE_INVENTORY.json content (or null)
 * @param {string} message normalized user prompt
 * @returns {Array<{key:string,count:number,threshold:number}>|null}
 */
export function detectSaturatedCategories(inv, message) {
  if (!inv || typeof message !== "string" || message.length === 0) return null;
  const hits = [];
  for (const { key, re } of CATEGORY_INTENT) {
    if (!re.test(message)) continue;
    // Coerce non-finite/non-numeric inventory values to 0 explicitly. Without
    // this, `Number("not-a-number")` yields NaN and `NaN > threshold` is
    // false — same end behavior but the contract should be honest.
    const raw = Number(inv[key] ?? 0);
    const count = Number.isFinite(raw) ? raw : 0;
    const threshold = SATURATION_THRESHOLDS[key] ?? Infinity;
    if (count > threshold) hits.push({ key, count, threshold });
  }
  return hits.length > 0 ? hits : null;
}

function passthrough() { process.stdout.write(JSON.stringify({ continue: true })); }

// Skip stdin parsing in test mode (when running under vitest the file is
// imported, not executed as a hook entrypoint).
if (process.env.PRISM_INVENTORY_GUARD_AS_LIB === "1") {
  // Library mode for unit tests — no I/O.
} else {
  let input;
  try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); }
  catch { passthrough(); process.exit(0); }

  const message = String(input?.prompt || input?.message?.content || input?.message || "");
  const detectsBuildIntent = BUILD_PATTERNS.some((p) => p.test(message));
  if (!detectsBuildIntent) { passthrough(); process.exit(0); }

  let inv = null;
  try { inv = JSON.parse(readFileSync(INVENTORY_PATH, "utf8")); } catch { /* keep null */ }

  const compact = inv
    ? `PRISM: ${inv.engines || 0} engines | ${inv.dispatchers || 0} dispatchers | ${inv.actions || 0} actions | ${inv.algorithms || 0} algorithms | ${inv.hooks_registry || 0} hooks | ${inv.skills || 0} skills | ${inv.tests_passing || 0} tests`
    : "Inventory unavailable";

  // Saturation arm only fires when the prompt expresses CREATE intent
  // (not audit/review/investigate). The warning text presupposes a new
  // asset is about to be made; firing on `audit engines` would be wrong.
  const saturated = hasCreateIntent(message)
    ? detectSaturatedCategories(inv, message)
    : null;
  const saturationLine = saturated
    ? `\n**[Saturation]** ${saturated
        .map((h) => `${h.key}=${h.count} (>${h.threshold})`)
        .join(", ")} — consider extending an existing asset before creating.`
    : "";

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: `**[Inventory]** ${compact}\nCheck MASTER_INDEX_COMPACT.md + DuplicationGuardEngine before creating.${saturationLine}`,
    },
  }));
}
