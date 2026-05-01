#!/usr/bin/env node
/**
 * audit-stop-hooks.mjs — Stop Hook Integrity Audit
 *
 * Built for KNOWLEDGE-WIKI-MS0/U-WIKI00 after Agent 15 scrutiny found:
 * - 33 orphaned stop_on_*.mjs files not in settings.json
 * - 19 hooks silently disabled via DISABLED_TOKEN_REDUX_2026_04_23 marker
 * - always-build-guard.mjs promised in MEMORY.md but unwired
 *
 * Reads:  H:/prism/.claude/hooks/*.mjs, H:/prism/.claude/settings.json
 * Writes: H:/prism/state/shared/STOP_HOOK_AUDIT_<DATE>.md
 *
 * Output is read-only — does NOT modify settings.json. User reviews + approves.
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const REPO = "H:/prism";
const HOOKS_DIR = join(REPO, ".claude", "hooks");
const SETTINGS = join(REPO, ".claude", "settings.json");
const OUTPUT_DIR = join(REPO, "state", "shared");
const DATE = new Date().toISOString().slice(0, 10);
const OUTPUT = join(OUTPUT_DIR, `STOP_HOOK_AUDIT_${DATE}.md`);
const REDUX_MARKER = "DISABLED_TOKEN_REDUX_2026_04_23";

function listMjs(dir) {
  const out = [];
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (entry.endsWith(".mjs")) out.push(p);
    }
  }
  walk(dir);
  return out;
}

function isStopHookFile(filePath) {
  const name = basename(filePath).toLowerCase();
  if (name.startsWith("stop_on_") || name.startsWith("stop-")) return true;
  if (name.includes("session-end") || name.includes("post-task")) return true;
  if (name.includes("post-compact") || name === "always-build-guard.mjs") return true;
  if (name.includes("session-cleanup") || name.includes("session-learning-feedback")) return true;
  if (name.includes("duplication-guard-stop") || name.includes("git-sync-stop")) return true;
  return false;
}

function isBuildCritical(name) {
  const n = basename(name).toLowerCase();
  return [
    "always-build-guard",
    "stop_on_build_error",
    "stop_on_failing_tests",
    "stop_on_missing_tests",
    "stop_on_broken_imports",
    "stop_on_unwired_assets",
    "stop_on_orphan_engine",
    "stop_on_skill_unwired",
    "stop_on_dirty_registry",
    "stop_on_unregistered_asset",
    "stop_on_circular_deps",
    "stop_on_uncommitted_critical",
    "comprehensive-build-enforce",
    "duplication-guard-stop",
  ].some((k) => n.includes(k));
}

function isDisabledByMarker(filePath) {
  try {
    const head = readFileSync(filePath, "utf8").slice(0, 4096);
    return head.includes(REDUX_MARKER);
  } catch {
    return false;
  }
}

function loadRegisteredStopHooks() {
  if (!existsSync(SETTINGS)) return { entries: [], rawError: "settings.json missing" };
  let json;
  try {
    json = JSON.parse(readFileSync(SETTINGS, "utf8"));
  } catch (e) {
    return { entries: [], rawError: `settings.json parse failed: ${e.message}` };
  }
  const entries = [];
  const stopMatchers = json?.hooks?.Stop ?? [];
  for (const matcher of stopMatchers) {
    const hooks = matcher?.hooks ?? [];
    for (const h of hooks) {
      const cmd = h?.command ?? "";
      const continueOnError = h?.continueOnError ?? null;
      // Pull the .mjs filename out of the command string
      const match = cmd.match(/([\w-]+\.mjs)/);
      if (match) entries.push({ file: match[1], continueOnError, raw: cmd });
    }
  }
  return { entries, rawError: null };
}

// ─── Run audit ────────────────────────────────────────────────────────────

const allMjs = listMjs(HOOKS_DIR);
const stopHookFiles = allMjs.filter(isStopHookFile).map((p) => basename(p));
const registered = loadRegisteredStopHooks();
const registeredNames = new Set(registered.entries.map((e) => e.file));

const orphans = stopHookFiles.filter((f) => !registeredNames.has(f));
const brokenRefs = registered.entries.filter((e) => !stopHookFiles.includes(e.file));

const disabledByMarker = allMjs
  .filter(isDisabledByMarker)
  .map((p) => basename(p));

// Categorize orphans by build-critical status
const orphansBuildCritical = orphans.filter(isBuildCritical);
const orphansAdvisory = orphans.filter((f) => !isBuildCritical(f));

// ─── Write report ─────────────────────────────────────────────────────────

const lines = [];
lines.push(`# Stop Hook Audit — ${DATE}`);
lines.push("");
lines.push(`Source: \`scripts/audit-stop-hooks.mjs\` (auto-generated, read-only audit)`);
lines.push(`Trigger: KNOWLEDGE-WIKI-MS0 / U-WIKI00 — Agent 15 scrutiny score 28/100`);
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`- Total \`.mjs\` hook files in \`.claude/hooks/\`: **${allMjs.length}**`);
lines.push(`- Stop-event hook files (by naming): **${stopHookFiles.length}**`);
lines.push(`- Registered in \`settings.json\` Stop array: **${registered.entries.length}**`);
lines.push(`- Orphans (file exists, NOT registered): **${orphans.length}**`);
lines.push(`  - Build-critical (should re-register): **${orphansBuildCritical.length}**`);
lines.push(`  - Advisory (review case-by-case): **${orphansAdvisory.length}**`);
lines.push(`- Broken refs (registered, file missing): **${brokenRefs.length}**`);
lines.push(`- Hooks disabled via \`${REDUX_MARKER}\` marker: **${disabledByMarker.length}**`);
if (registered.rawError) {
  lines.push(`- ⚠️ Settings load issue: ${registered.rawError}`);
}
lines.push("");

lines.push("## 🔴 Build-Critical Orphans (RECOMMEND RE-REGISTER, continueOnError:false)");
lines.push("");
lines.push("Per `MEMORY.md` `feedback_dont_soften_completeness_gates.md`: these guard correctness, not advisory.");
lines.push("");
lines.push("| Approve? | Hook file | Notes |");
lines.push("|----------|-----------|-------|");
for (const f of orphansBuildCritical) {
  lines.push(`| [ ] | \`${f}\` | Build-critical per filename heuristic — review file head before re-enabling |`);
}
if (orphansBuildCritical.length === 0) lines.push("| _none_ | | |");
lines.push("");

lines.push("## 🟡 Advisory Orphans (review case-by-case)");
lines.push("");
lines.push("| Approve? | Hook file |");
lines.push("|----------|-----------|");
for (const f of orphansAdvisory) {
  lines.push(`| [ ] | \`${f}\` |`);
}
if (orphansAdvisory.length === 0) lines.push("| _none_ | |");
lines.push("");

lines.push("## ✅ Currently Registered Stop Hooks");
lines.push("");
lines.push("| File | continueOnError | Effective gate? |");
lines.push("|------|-----------------|-----------------|");
for (const e of registered.entries) {
  const blocking = e.continueOnError === false ? "✅ BLOCKING" : "⚠️ advisory only";
  lines.push(`| \`${e.file}\` | \`${String(e.continueOnError)}\` | ${blocking} |`);
}
if (registered.entries.length === 0) lines.push("| _none_ | | |");
lines.push("");

if (brokenRefs.length > 0) {
  lines.push("## ⛔ Broken Refs (registered but file missing)");
  lines.push("");
  for (const e of brokenRefs) {
    lines.push(`- \`${e.file}\` — registered in settings.json but no file at \`${HOOKS_DIR}/${e.file}\``);
  }
  lines.push("");
}

lines.push(`## 🔇 Disabled via \`${REDUX_MARKER}\` Marker`);
lines.push("");
lines.push("Files with this marker short-circuit early (`process.exit(0)`) — silently advisory.");
lines.push("Per `feedback_dont_soften_completeness_gates.md`, correctness-critical ones should be re-enabled.");
lines.push("");
lines.push("| Approve re-enable? | Hook file |");
lines.push("|--------------------|-----------|");
for (const f of disabledByMarker) {
  lines.push(`| [ ] | \`${f}\` |`);
}
if (disabledByMarker.length === 0) lines.push("| _none_ | |");
lines.push("");

lines.push("## Recommended Actions (after user approval)");
lines.push("");
lines.push("1. **Re-register** every checkbox-approved build-critical orphan with `continueOnError: false`.");
lines.push("2. **Re-register** approved advisory orphans with `continueOnError: true` (warning, not blocking).");
lines.push("3. **Remove `DISABLED_TOKEN_REDUX_2026_04_23` marker** from each approved file.");
lines.push("4. **Update `.claude/helpers/apply-hook-fixes.mjs`** with allowlist preventing future re-disable of build-critical hooks.");
lines.push("5. **Smoke test**: deliberately introduce a failing test, attempt `/handoff` — verify Stop hook BLOCKS the session end.");
lines.push("");
lines.push("---");
lines.push(`_Generated by audit-stop-hooks.mjs at ${new Date().toISOString()}_`);

writeFileSync(OUTPUT, lines.join("\n"), "utf8");

// Console summary
console.log(`Stop Hook Audit complete: ${OUTPUT}`);
console.log(`  total mjs hooks: ${allMjs.length}`);
console.log(`  stop-event files: ${stopHookFiles.length}`);
console.log(`  registered: ${registered.entries.length}`);
console.log(`  orphans: ${orphans.length} (build-critical: ${orphansBuildCritical.length})`);
console.log(`  broken refs: ${brokenRefs.length}`);
console.log(`  disabled via marker: ${disabledByMarker.length}`);
