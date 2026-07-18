#!/usr/bin/env node
// iter11: per-stockpile JSON summary. Mirrors the by-dispatcher.md report
// but keyed by source_stockpile for tooling that wants the 740 vs 1048 cut.
import fs from 'node:fs';
const IN = 'H:/PRISM/state/shared/extracted-modules-classified.json';
const OUT = 'H:/PRISM/state/shared/extracted-modules-by-stockpile.json';
const j = JSON.parse(fs.readFileSync(IN, 'utf8'));
const by = {};
for (const m of j.modules) {
  const s = m.source_stockpile;
  by[s] ??= { total: 0, by_status: {}, by_type: {}, by_dispatcher: {}, total_lines: 0,
              top_wire: [], top_db: [] };
  by[s].total++;
  by[s].total_lines += m.lines;
  by[s].by_status[m.dup_status] = (by[s].by_status[m.dup_status] || 0) + 1;
  by[s].by_type[m.type] = (by[s].by_type[m.type] || 0) + 1;
  if (m.recommended_dispatcher && m.recommended_dispatcher !== 'n/a') {
    by[s].by_dispatcher[m.recommended_dispatcher] = (by[s].by_dispatcher[m.recommended_dispatcher] || 0) + 1;
  }
}
for (const s of Object.keys(by)) {
  by[s].top_wire = j.modules
    .filter(m => m.source_stockpile === s && m.dup_status === 'WIRE_CANDIDATE')
    .sort((a, b) => b.lines - a.lines).slice(0, 10)
    .map(m => ({ path: m.path, name: m.name, lines: m.lines, dispatcher: m.recommended_dispatcher }));
  by[s].top_db = j.modules
    .filter(m => m.source_stockpile === s && m.dup_status === 'DATABASE')
    .sort((a, b) => b.lines - a.lines).slice(0, 10)
    .map(m => ({ path: m.path, name: m.name, lines: m.lines }));
}
fs.writeFileSync(OUT, JSON.stringify({ schemaVersion: '1.0.0', generated_at: new Date().toISOString(), by_stockpile: by }, null, 2));
console.log(`ok: ${OUT} — stockpiles=${Object.keys(by).length}`);
