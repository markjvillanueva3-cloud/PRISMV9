#!/usr/bin/env node
// iter6: emit state/shared/extracted-modules-classified.csv for spreadsheet/tooling.
import fs from 'node:fs';
const IN = 'H:/PRISM/state/shared/extracted-modules-classified.json';
const OUT = 'H:/PRISM/state/shared/extracted-modules-classified.csv';
const HEADER = 'stockpile,category,type,dup_status,dispatcher,lines,size_bytes,match_confidence,matched_engine,path';
const esc = v => String(v ?? '').replace(/["\n,]/g, '_');
const j = JSON.parse(fs.readFileSync(IN, 'utf8'));
const rows = j.modules.map(m => [m.source_stockpile, m.category, m.type, m.dup_status,
  m.recommended_dispatcher, m.lines, m.size_bytes, m.match_confidence,
  (m.matched_engine || ''), m.path].map(esc).join(','));
const csv = [HEADER, ...rows].join('\n');
fs.writeFileSync(OUT, csv);
console.log(`ok: csv rows=${rows.length} bytes=${csv.length} -> ${OUT}`);
