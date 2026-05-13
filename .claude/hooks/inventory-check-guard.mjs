#!/usr/bin/env node
/**
 * inventory-check-guard.mjs — UserPromptSubmit hook (U-AWARE02, refactored H9).
 *
 * Detects build/create/audit intent in user messages and injects current
 * PRISM inventory counts as mandatory context.
 *
 * H9 changes (from pre-H9 form):
 *   • Fixed phantom `readStdinSafe()` call (the function never existed —
 *     the original swallowed a ReferenceError silently every fire, which
 *     meant the inventory line *never* actually injected).
 *   • Reduced to a strict shim shape.
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

function passthrough() { process.stdout.write(JSON.stringify({ continue: true })); }

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

process.stdout.write(JSON.stringify({
  continue: true,
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: `**[Inventory]** ${compact}\nCheck MASTER_INDEX_COMPACT.md + DuplicationGuardEngine before creating.`,
  },
}));
