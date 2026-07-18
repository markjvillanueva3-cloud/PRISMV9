#!/usr/bin/env node
/**
 * orphan-engine-census.mjs
 *
 * Identifies engines that have ZERO references in any dispatcher file —
 * the population the audit calls "truly orphan, dispatcher-unwired".
 * Output: state/shared/orphan-engine-census.json with full list.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ENGINES_DIR = "H:/prism/mcp-server/src/engines";
const DISPATCHER_DIR = "H:/prism/mcp-server/src/tools/dispatchers";
const OUT_PATH = "H:/prism/state/shared/orphan-engine-census.json";

const engines = readdirSync(ENGINES_DIR)
  .filter((f) => f.endsWith("Engine.ts"))
  .map((f) => f.replace(".ts", ""));

const dispatcherText = readdirSync(DISPATCHER_DIR)
  .filter((f) => f.endsWith(".ts"))
  .map((f) => readFileSync(join(DISPATCHER_DIR, f), "utf8"))
  .join("\n");

const orphan = [];
const wired = [];
for (const eng of engines) {
  const camel = eng.charAt(0).toLowerCase() + eng.slice(1);
  // Word-boundary check on PascalCase OR camelCase form.
  const re = new RegExp(`\\b(${eng}|${camel})\\b`);
  if (!re.test(dispatcherText)) orphan.push(eng);
  else wired.push(eng);
}

console.log(`Engines total: ${engines.length}`);
console.log(`  wired:  ${wired.length} (${((100 * wired.length) / engines.length).toFixed(1)}%)`);
console.log(`  orphan: ${orphan.length} (${((100 * orphan.length) / engines.length).toFixed(1)}%)`);

// Top-domain breakdown
const byPrefix = new Map();
for (const o of orphan) {
  // crude domain by first capitalized prefix word
  const m = o.match(/^([A-Z][a-z]+|[A-Z]+(?=[A-Z]))/);
  const k = m ? m[1] : "Other";
  byPrefix.set(k, (byPrefix.get(k) || 0) + 1);
}
const sortedDomains = [...byPrefix.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
console.log(`\nOrphan distribution by prefix domain (top 25):`);
for (const [k, v] of sortedDomains) console.log(`  ${k.padEnd(20)} ${v}`);

writeFileSync(
  OUT_PATH,
  JSON.stringify(
    {
      generated: new Date().toISOString(),
      totalEngines: engines.length,
      wiredCount: wired.length,
      orphanCount: orphan.length,
      domainBreakdown: Object.fromEntries(sortedDomains),
      orphanList: orphan,
    },
    null,
    2,
  ),
);
console.log(`\nFull list: ${OUT_PATH}`);
