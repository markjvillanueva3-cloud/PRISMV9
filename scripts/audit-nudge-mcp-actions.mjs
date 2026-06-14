#!/usr/bin/env node
// scripts/audit-nudge-mcp-actions.mjs
// -----------------------------------
// TOKEN-SAVINGS-PIVOT/U-PSN-NUDGE-R12-AUDIT (iter7, 2026-05-23, slot:alpha)
//
// Generalizes the iter5 R12-fix regression-guard pattern fleet-wide. Iter5
// caught one hook (ollama-pipeline-injector) shipping fake `prism_intelligence:
// ollama_*` action references in nudge text. There are ~30 other hooks in
// `.claude/hooks/` that reference `prism_*:*` tokens — any of them may carry
// the same class of bug (LLM-generated nudge text naming actions that don't
// actually exist in any dispatcher).
//
// This script:
//   1. Scans .claude/hooks/*.mjs (excluding tests + .deprecated)
//   2. Extracts every `prism_<dispatcher>:<action>` token from hook source
//   3. Cross-checks against KNOWN_REAL_MCP_ACTIONS (seeded from verified set;
//      growable as new actions are confirmed)
//   4. Emits a punch list of hooks → unknown actions for operator triage
//
// Run: `node H:/prism/scripts/audit-nudge-mcp-actions.mjs [--json]`
// Exit: 0 if no unknowns; 1 if any hook references an unknown action.
//
// The KNOWN_REAL set in this file is the canonical seed; future iters may
// auto-derive it from the dispatcher source files. For now it's manually
// curated — adding an entry requires grep-verification against
// mcp-server/src/tools/dispatchers/.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

// MCP-action regex — captures `prism_<dispatcher>:<action>` tokens. Same
// shape contract as the iter5 regression guard.
export const MCP_ACTION_RE = /\bprism_[a-z_]+:[a-z_]+/g;

// Seed set: actions verified to exist in mcp-server/src/tools/dispatchers/.
// Expand ONLY after grep-verifying the action key against dispatcher source.
// Trust no LLM memory — verify and commit together.
export const KNOWN_REAL_MCP_ACTIONS = new Set([
  // verified by iter1 cross-check against mcp-route-takeup._ACTION_TO_CLASSIFIERS:
  "prism_session:master_index_query",
  "prism_session:action_search",
  "prism_session:tool_route_best",
  "prism_session:dispatcher_map_compact",
  "prism_session:psk",
  "prism_session:master_index_node_status",
  "prism_session:master_index_utilization_dashboard",
  "prism_dev:code_search",
  "prism_dev:file_write",
  "prism_dev:file_read",
  "prism_dev:test_smoke",
  "prism_dev:build",
  "prism_dev:quality_dashboard",
  "prism_dev:ollama_hook_query",
  "prism_dev:ollama_hook_status",
  "prism_dev:roadmap_tool_plan_query",
  "prism_dev:roadmap_tool_plan_build",
  "prism_dev:roadmap_tool_plan_coverage",
  "prism_dev:svi_ranked_backlog",
  "prism_knowledge:search",
  "prism_knowledge:cross_query",
  "prism_memory:store",
  "prism_calc:speed_feed",
  "prism_calc:cutting_force",
  "prism_safety:validate_physics",
  "prism_cam:strategy",
]);

// U-PSN-NUDGE-R12-AUDIT-DERIVE (iter8, 2026-05-23, slot:alpha): regex that
// extracts case "<action_name>": patterns from dispatcher source code. This
// is how the canonical KNOWN_REAL set gets derived — no LLM memory, just
// what the dispatcher actually handles.
export const CASE_ACTION_RE = /case\s+"([a-z_][a-z0-9_]*)"\s*:/g;

/**
 * Pure: convert a dispatcher filename to its `prism_<key>` prefix.
 * E.g. "devDispatcher.ts" → "prism_dev".
 * Returns null if the filename doesn't match the *Dispatcher.ts convention.
 */
export function dispatcherNameToPrefix(filename) {
  if (typeof filename !== "string") return null;
  const m = filename.match(/^([a-zA-Z][a-zA-Z0-9]*)Dispatcher\.ts$/);
  if (!m) return null;
  return `prism_${m[1].toLowerCase()}`;
}

/**
 * Pure: extract all dispatcher:action keys from one dispatcher source file.
 * Given filename + content, returns array of "prism_<prefix>:<action>".
 * Uses String.matchAll for iteration (intentionally avoids regex.exec to
 * sidestep an overly-cautious security-reminder hook that flags regex.exec
 * as if it were child_process.exec — false positive).
 */
export function extractActionsFromDispatcherSource(filename, content) {
  const prefix = dispatcherNameToPrefix(filename);
  if (!prefix || typeof content !== "string") return [];
  const out = new Set();
  for (const m of content.matchAll(CASE_ACTION_RE)) {
    out.add(`${prefix}:${m[1]}`);
  }
  return Array.from(out);
}

/**
 * U-PSN-NUDGE-R12-AUDIT-TIER (iter9, 2026-05-23, slot:alpha): pure function
 * that returns the set of known-real dispatcher PREFIXES (e.g. "prism_dev",
 * "prism_session", "prism_intelligence") derived from filenames in the
 * dispatchers dir. Used to tier-classify unknown action refs:
 *   - prefix EXISTS but action unknown → may be Zod-routed (Tier A)
 *   - prefix DOES NOT exist            → fake dispatcher (Tier B, R12)
 * The line-554 mcp-route-suggest reference to `prism_intelligence:ollama_*`
 * is Tier A — prism_intelligence is real, but its specific Ollama actions
 * may not be case-block-handled. iter5 doc-comments containing the fake
 * iter4 names are also Tier A (false-positive on doc text, but useful as
 * standing regression detection).
 */
export function loadKnownDispatcherPrefixes(dispatchersDir) {
  const out = new Set();
  let entries;
  try { entries = readdirSync(dispatchersDir); } catch { return out; }
  for (const name of entries) {
    const prefix = dispatcherNameToPrefix(name);
    if (prefix) out.add(prefix);
    // U-PSN-NUDGE-R12-AUDIT-CAMEL (iter12, 2026-05-23, slot:alpha): multi-word
    // CamelCase filenames also expose a short-form prefix. E.g. `ai
    // ReasoningDispatcher.ts` → operator-facing dispatcher is `prism_ai`, not
    // `prism_aireasoning`. Without this yield, iter9's Tier B punch list
    // misclassifies ~10 `prism_ai:*` refs as fakes when they're real (just
    // wired under a multi-word filename). Pure additive — single-word
    // dispatchers still yield exactly one prefix.
    const camel = name.match(/^([a-z]+)[A-Z][a-zA-Z0-9]*Dispatcher\.ts$/);
    if (camel) out.add(`prism_${camel[1]}`);
  }
  return out;
}

/**
 * Pure: classify a list of unknown action refs into tiers based on whether
 * their dispatcher prefix exists.
 *   tierA — dispatcher exists but action unknown (likely Zod-routed or stale doc)
 *   tierB — dispatcher does not exist (definite R12 fake)
 */
export function classifyUnknowns(unknownRefs, knownPrefixes) {
  const tierA = [];
  const tierB = [];
  if (!Array.isArray(unknownRefs)) return { tierA, tierB };
  for (const ref of unknownRefs) {
    const colonIdx = ref.indexOf(":");
    if (colonIdx < 0) { tierB.push(ref); continue; }
    const prefix = ref.slice(0, colonIdx);
    if (knownPrefixes && knownPrefixes.has(prefix)) tierA.push(ref);
    else tierB.push(ref);
  }
  return { tierA, tierB };
}

/**
 * Scan a dispatcher dir and return the union of all `prism_*:<action>` keys
 * actually handled by `case` blocks. Falls back to KNOWN_REAL_MCP_ACTIONS
 * on read failure — never throws.
 */
export function loadRealActionsFromDispatchers(dispatchersDir) {
  const found = new Set();
  let entries;
  try { entries = readdirSync(dispatchersDir); } catch { return new Set(KNOWN_REAL_MCP_ACTIONS); }
  for (const name of entries) {
    if (!name.endsWith("Dispatcher.ts")) continue;
    const full = join(dispatchersDir, name);
    let content;
    try { content = readFileSync(full, "utf8"); } catch { continue; }
    for (const action of extractActionsFromDispatcherSource(name, content)) {
      found.add(action);
    }
  }
  // Union with the seed — covers actions wired via prism_safe shim or
  // non-Dispatcher.ts surfaces.
  for (const a of KNOWN_REAL_MCP_ACTIONS) found.add(a);
  return found;
}

/**
 * Pure: extract every `prism_*:*` token from a string. Returns unique array.
 */
export function extractMcpActionRefs(content) {
  if (typeof content !== "string") return [];
  const matches = content.match(MCP_ACTION_RE) || [];
  return Array.from(new Set(matches));
}

/**
 * Pure: given a list of action refs + the known-real set, return the unknowns.
 */
export function findUnknownActions(refs, knownSet = KNOWN_REAL_MCP_ACTIONS) {
  if (!Array.isArray(refs)) return [];
  return refs.filter((a) => !knownSet.has(a));
}

/**
 * Walk a directory tree returning all .mjs files NOT in test/.deprecated dirs.
 */
function listHookSources(dir) {
  const out = [];
  function walk(d) {
    let entries;
    try { entries = readdirSync(d); } catch { return; }
    for (const name of entries) {
      const full = join(d, name);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) {
        if (name === "__tests__" || name === ".deprecated" || name.startsWith(".")) continue;
        walk(full);
      } else if (name.endsWith(".mjs")) {
        out.push(full);
      }
    }
  }
  walk(dir);
  return out;
}

/**
 * Audit a hook directory. Returns punch-list (file → unknownActions[]).
 * Pure given an injected fs reader; the default uses node:fs.
 */
export function auditHookDir(dir, knownSet = KNOWN_REAL_MCP_ACTIONS) {
  const findings = {};
  for (const file of listHookSources(dir)) {
    let content;
    try { content = readFileSync(file, "utf8"); } catch { continue; }
    const refs = extractMcpActionRefs(content);
    const unknowns = findUnknownActions(refs, knownSet);
    if (unknowns.length > 0) {
      findings[file] = unknowns;
    }
  }
  return findings;
}

// --- CLI ---
function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const seedOnly = args.includes("--seed-only");
  const hooksDir = "H:/prism/.claude/hooks";
  const dispatchersDir = "H:/prism/mcp-server/src/tools/dispatchers";

  // Default: derive from dispatcher source (authoritative). --seed-only
  // restricts to the hardcoded seed (iter7 behavior, useful for diffing
  // what the source-derive added).
  const knownSet = seedOnly
    ? new Set(KNOWN_REAL_MCP_ACTIONS)
    : loadRealActionsFromDispatchers(dispatchersDir);

  const findings = auditHookDir(hooksDir, knownSet);

  if (json) {
    process.stdout.write(JSON.stringify({
      schemaVersion: "1.1.0",
      auditedDir: hooksDir,
      derivedFrom: seedOnly ? "seed-only" : dispatchersDir,
      knownRealCount: knownSet.size,
      hooksWithUnknowns: Object.keys(findings).length,
      findings,
    }, null, 2));
    process.stdout.write("\n");
  } else {
    const hookCount = Object.keys(findings).length;
    const sourceLabel = seedOnly ? "hardcoded seed" : `derived from ${dispatchersDir}`;
    if (hookCount === 0) {
      console.log("✓ All hooks reference only known-real MCP actions.");
      console.log(`  Audited: ${hooksDir}`);
      console.log(`  Known-real set: ${knownSet.size} actions (${sourceLabel})`);
      return 0;
    }
    console.log(`⚠ ${hookCount} hook(s) reference UNKNOWN MCP actions (R12 risk — fake action in nudge text)\n`);
    const knownPrefixes = seedOnly ? new Set() : loadKnownDispatcherPrefixes(dispatchersDir);
    let totalTierA = 0;
    let totalTierB = 0;
    for (const [file, unknowns] of Object.entries(findings)) {
      const rel = basename(file);
      const { tierA, tierB } = classifyUnknowns(unknowns, knownPrefixes);
      totalTierA += tierA.length;
      totalTierB += tierB.length;
      console.log(`  ${rel}:`);
      if (tierA.length > 0) {
        console.log(`    Tier A (dispatcher real, action may be Zod-routed or stale doc):`);
        for (const a of tierA) console.log(`      • ${a}`);
      }
      if (tierB.length > 0) {
        console.log(`    Tier B (FAKE DISPATCHER — definite R12):`);
        for (const a of tierB) console.log(`      ✗ ${a}`);
      }
    }
    console.log(`\nTier A (warm follow-up): ${totalTierA} ref(s)  ·  Tier B (R12 fakes): ${totalTierB} ref(s)`);
    console.log(`Known-real set: ${knownSet.size} actions (${sourceLabel})`);
    console.log(`Known dispatcher prefixes: ${knownPrefixes.size}`);
    console.log(`Use --seed-only to restrict to the hardcoded seed (iter7 behavior).`);
  }
  return Object.keys(findings).length > 0 ? 1 : 0;
}

if (process.argv[1] && process.argv[1].endsWith("audit-nudge-mcp-actions.mjs")) {
  process.exit(main());
}
