#!/usr/bin/env node
// iter12: single-row lookup helper. node lookup-extracted-module.mjs <name>
// Returns the manifest+classification row matching name (case-insensitive
// substring) so operators don't have to write jq.
import fs from 'node:fs';
const ARG = process.argv[2];
if (!ARG) { console.error('usage: node lookup-extracted-module.mjs <name-substring>'); process.exit(2); }
const j = JSON.parse(fs.readFileSync('H:/PRISM/state/shared/extracted-modules-classified.json', 'utf8'));
const needle = ARG.toUpperCase();
const hits = j.modules.filter(m => m.name.toUpperCase().includes(needle) || m.path.toUpperCase().includes(needle));
if (hits.length === 0) { console.error(`no match for "${ARG}"`); process.exit(1); }
hits.sort((a, b) => b.lines - a.lines);
console.log(JSON.stringify(hits.slice(0, 20).map(m => ({
  path: m.path,
  name: m.name,
  stockpile: m.source_stockpile,
  status: m.dup_status,
  lines: m.lines,
  dispatcher: m.recommended_dispatcher,
  matched_engine: m.matched_engine,
  confidence: m.match_confidence,
})), null, 2));
console.error(`matched ${hits.length} module(s), showing top ${Math.min(hits.length, 20)} by lines`);
