#!/usr/bin/env node
/**
 * always-build-guard.mjs — Stop Hook
 * ===================================
 *
 * Enforces the "ALWAYS BUILD, NEVER SKIP" rule.
 *
 * When a gap analysis identifies missing engines/features, they must be
 * recorded in PENDING_GAP_ENGINES.json and built before the session ends.
 * This hook blocks session stop (non-fatal warning) if any pending gap
 * engine remains unbuilt.
 *
 * Registry file: H:/prism/state/shared/PENDING_GAP_ENGINES.json
 *   {
 *     "gaps": [
 *       { "name": "FooEngine", "rationale": "...", "milestone": "MS7",
 *         "addedAt": "ISO-date", "built": false, "builtAt": null,
 *         "commit": null }
 *     ],
 *     "lastUpdated": "ISO-date"
 *   }
 *
 * Usage from Claude: before deciding to skip any identified gap engine,
 * append it to `gaps[]` with built:false. When built + committed, flip
 * to built:true and record commit SHA. This hook reads the file on Stop.
 *
 * Exit codes:
 *   0 = no pending gaps, allow stop
 *   0 + stderr warning = pending gaps present, allow but warn loudly
 *
 * Hook does NOT hard-block (continueOnError: true in settings.json) —
 * it prints an unmistakable reminder so future sessions know to finish
 * the work. The rule lives in feedback_always_build.md memory.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const REGISTRY = resolve("H:/prism/state/shared/PENDING_GAP_ENGINES.json");

function readRegistry() {
  if (!existsSync(REGISTRY)) return { gaps: [], lastUpdated: null };
  try {
    return JSON.parse(readFileSync(REGISTRY, "utf8"));
  } catch {
    return { gaps: [], lastUpdated: null };
  }
}

function main() {
  const reg = readRegistry();
  const pending = (reg.gaps ?? []).filter((g) => g && g.built !== true);
  if (pending.length === 0) {
    process.exit(0);
  }

  const lines = [
    "",
    "=================================================================",
    "  ALWAYS BUILD, NEVER SKIP — STOP HOOK GUARD",
    "=================================================================",
    `  ${pending.length} gap engine(s) identified but NOT YET BUILT:`,
    "",
  ];
  for (const g of pending) {
    lines.push(`    - ${g.name}${g.milestone ? ` (${g.milestone})` : ""}`);
    if (g.rationale) lines.push(`      → ${g.rationale}`);
  }
  lines.push("");
  lines.push("  Rule: when gap analysis identifies engines, BUILD ALL OF THEM.");
  lines.push("  Do not recommend skipping thin/narrow/domain-specific engines.");
  lines.push(`  Registry: ${REGISTRY}`);
  lines.push("  Flip gaps[i].built=true + record commit SHA after building.");
  lines.push("=================================================================");
  lines.push("");

  process.stderr.write(lines.join("\n"));
  process.exit(0);
}

main();
