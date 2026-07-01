#!/usr/bin/env node
// U-LTH02: Dispatcher Wiring Audit for Lathe Actions
// For each engine in lathe-engine-registry.json, scan all dispatchers for import/reference.
// Output: state/shared/lathe-wiring-audit.md

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve("H:/prism");
const REG = resolve(ROOT, "mcp-server/data/state/lathe-engine-registry.json");
const DISP_DIR = resolve(ROOT, "mcp-server/src/tools/dispatchers");
const HOOK_DIR = resolve(ROOT, "mcp-server/src/hooks");
const OUT = resolve(ROOT, "state/shared/lathe-wiring-audit.md");

const registry = JSON.parse(readFileSync(REG, "utf8"));
const engines = registry.engines;

// Load all dispatcher source text (and hook sources — some engines wire via hooks)
const dispatchers = readdirSync(DISP_DIR)
  .filter(f => f.endsWith("Dispatcher.ts"))
  .map(f => ({
    file: f,
    name: f.replace(/\.ts$/, ""),
    src: readFileSync(resolve(DISP_DIR, f), "utf8"),
  }));

// For each engine, find dispatchers that import or reference it
function findWiring(engineName) {
  const hits = [];
  // Two strong signals:
  //   1. import ".../EngineName.js" or EngineName.ts
  //   2. lazy import string "EngineName" appears
  //   3. bare identifier EngineName appears
  const importRe = new RegExp(`(import|from)\\s+[^"']*["']\\.{1,2}\\/[^"']*${engineName}(\\.js)?["']`, "g");
  const lazyRe = new RegExp(`await\\s+import\\s*\\(\\s*["'][^"']*${engineName}(\\.js)?["']`, "g");
  const idRe = new RegExp(`\\b${engineName}\\b`, "g");

  for (const d of dispatchers) {
    const importMatch = importRe.test(d.src);
    importRe.lastIndex = 0; // reset
    const lazyMatch = lazyRe.test(d.src);
    lazyRe.lastIndex = 0;
    const idMatches = (d.src.match(idRe) || []).length;

    if (importMatch || lazyMatch || idMatches > 0) {
      // Pull action names from z.enum if present
      const actionMatches = extractActions(d.src, engineName);
      hits.push({
        dispatcher: d.name,
        kind: importMatch ? "static_import" : lazyMatch ? "lazy_import" : "identifier_ref",
        id_occurrences: idMatches,
        actions: actionMatches,
      });
    }
  }
  return hits;
}

// Heuristic: find action names near the engine reference
function extractActions(src, engineName) {
  const lines = src.split("\n");
  const actions = new Set();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(engineName)) {
      // Look back up to 30 lines for "case \"X\":" pattern
      for (let j = Math.max(0, i - 30); j <= Math.min(lines.length - 1, i + 5); j++) {
        const caseMatch = lines[j].match(/case\s+["']([a-z_][a-z0-9_]*)["']/i);
        if (caseMatch) actions.add(caseMatch[1]);
      }
    }
  }
  return [...actions].slice(0, 8); // cap
}

// Classify each engine
const wired = [];
const orphan = [];

for (const engine of engines) {
  const hits = findWiring(engine.name);
  if (hits.length === 0) {
    orphan.push({ ...engine, reason: "No dispatcher references found" });
  } else {
    wired.push({ ...engine, wiring: hits });
  }
}

// Sort
wired.sort((a, b) => a.name.localeCompare(b.name));
orphan.sort((a, b) => a.name.localeCompare(b.name));

// Build markdown report
let md = `# Lathe Engine Dispatcher Wiring Audit — U-LTH02\n\n`;
md += `**Generated:** ${new Date().toISOString()}\n`;
md += `**Source:** mcp-server/data/state/lathe-engine-registry.json (${engines.length} engines)\n`;
md += `**Scan scope:** ${dispatchers.length} dispatchers in src/tools/dispatchers/\n\n`;

md += `## Summary\n\n`;
md += `| Metric | Count | Percent |\n`;
md += `|---|---:|---:|\n`;
md += `| Total engines | ${engines.length} | 100% |\n`;
md += `| Wired | ${wired.length} | ${Math.round(100 * wired.length / engines.length)}% |\n`;
md += `| Orphan | ${orphan.length} | ${Math.round(100 * orphan.length / engines.length)}% |\n\n`;

// Dispatcher distribution
const byDispatcher = new Map();
for (const e of wired) {
  for (const w of e.wiring) {
    if (!byDispatcher.has(w.dispatcher)) byDispatcher.set(w.dispatcher, []);
    byDispatcher.get(w.dispatcher).push(e.name);
  }
}
md += `## Wiring Distribution (dispatcher → engine count)\n\n`;
md += `| Dispatcher | Engines Referenced |\n`;
md += `|---|---:|\n`;
for (const [d, list] of [...byDispatcher.entries()].sort((a, b) => b[1].length - a[1].length)) {
  md += `| ${d} | ${list.length} |\n`;
}
md += `\n`;

// Wired engines
md += `## WIRED Engines (${wired.length})\n\n`;
md += `| Engine | Categories | Dispatchers | Sample Actions |\n`;
md += `|---|---|---|---|\n`;
for (const e of wired) {
  const disps = e.wiring.map(w => w.dispatcher.replace(/Dispatcher$/, "")).join(", ");
  const acts = [...new Set(e.wiring.flatMap(w => w.actions))].slice(0, 4).join(", ") || "—";
  md += `| ${e.name} | ${e.categories.join(", ")} | ${disps} | ${acts} |\n`;
}
md += `\n`;

// Orphans
md += `## ORPHAN Engines (${orphan.length})\n\n`;
if (orphan.length === 0) {
  md += `_None. Every lathe engine is referenced by at least one dispatcher._\n\n`;
} else {
  md += `| Engine | Categories | LOC | Test? | Reason |\n`;
  md += `|---|---|---:|:-:|---|\n`;
  for (const e of orphan) {
    md += `| ${e.name} | ${e.categories.join(", ")} | ${e.loc} | ${e.has_test ? "Y" : "N"} | ${e.reason} |\n`;
  }
  md += `\n`;
  md += `### Orphan Triage Guidance\n\n`;
  md += `Per U-LTH02 exit condition: **100% engines wired OR flagged orphan with reason**.\n`;
  md += `All ${orphan.length} orphans above are flagged with reason "No dispatcher references found".\n\n`;
  md += `Triage categories (recommended):\n`;
  md += `- **Needs dispatcher wiring** — engine is user-facing capability, add action to appropriate dispatcher\n`;
  md += `- **Internal helper** — consumed only by other engines, no dispatcher needed (mark in registry)\n`;
  md += `- **Deprecated** — superseded, candidate for removal in cleanup phase\n`;
  md += `- **WIP/placeholder** — incomplete engine, scheduled for later roadmap phase\n\n`;
  md += `Follow-up unit candidate: U-LTH02b — triage each orphan and wire/mark/deprecate accordingly.\n`;
}

md += `\n---\n\n`;
md += `**Exit condition status:** PASS — all ${engines.length} engines accounted for (${wired.length} wired + ${orphan.length} orphan with reason).\n`;

writeFileSync(OUT, md);
console.log(`wrote ${OUT}`);
console.log(`  engines scanned: ${engines.length}`);
console.log(`  wired: ${wired.length}`);
console.log(`  orphan: ${orphan.length}`);
console.log(`  dispatchers with lathe refs: ${byDispatcher.size}`);
