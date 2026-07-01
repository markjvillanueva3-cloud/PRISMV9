#!/usr/bin/env node
// scripts/generate-extracted-modules-dispatcher-report.mjs
//
// iter5 (slot:papa /goal /loop). Emits state/shared/extracted-modules-by-
// dispatcher.md — human-readable triage report grouping top WIRE_CANDIDATEs +
// DATABASEs by recommended_dispatcher. Lets a slot picking work for a specific
// lane (prism_cad, prism_cam, etc.) browse to the next legacy absorption
// target without scanning the 1788-row JSON.
//
// Source: state/shared/extracted-modules-classified.json
// Output: state/shared/extracted-modules-by-dispatcher.md

import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'H:/PRISM';
const CLASSIFIED = path.join(ROOT, 'state/shared/extracted-modules-classified.json');
const OUT = path.join(ROOT, 'state/shared/extracted-modules-by-dispatcher.md');
const TOP_PER_DISPATCHER = 15;

function fmtLines(n) { return n.toLocaleString(); }

function buildReport(doc) {
  const wire = (doc.modules || []).filter(m => m.dup_status === 'WIRE_CANDIDATE');
  const db = (doc.modules || []).filter(m => m.dup_status === 'DATABASE');

  // Group both sets by recommended_dispatcher
  const groups = {};
  for (const m of [...wire, ...db]) {
    const d = m.recommended_dispatcher || 'unassigned';
    groups[d] ??= { wire: [], db: [] };
    if (m.dup_status === 'WIRE_CANDIDATE') groups[d].wire.push(m);
    else groups[d].db.push(m);
  }
  for (const g of Object.values(groups)) {
    g.wire.sort((a, b) => b.lines - a.lines);
    g.db.sort((a, b) => b.lines - a.lines);
  }

  const lines = [];
  lines.push(`# Extracted modules — by recommended dispatcher`);
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`Source: \`state/shared/extracted-modules-classified.json\` (1788 modules).`);
  lines.push(`Per-dispatcher cap: top ${TOP_PER_DISPATCHER} WIRE + top ${TOP_PER_DISPATCHER} DATABASE by line count.`);
  lines.push('');
  lines.push('Operators picking work for a specific lane (e.g. lima for prism_cad-only): browse to the dispatcher heading below and pick the top WIRE_CANDIDATE.');
  lines.push('');

  // Summary table
  lines.push('## Summary');
  lines.push('');
  lines.push('| Dispatcher | WIRE | DATABASE | Total lines (top-15 WIRE) |');
  lines.push('|---|---:|---:|---:|');
  const dispatchers = Object.keys(groups).sort();
  for (const d of dispatchers) {
    const g = groups[d];
    const wireSum = g.wire.slice(0, TOP_PER_DISPATCHER).reduce((s, m) => s + m.lines, 0);
    lines.push(`| ${d} | ${g.wire.length} | ${g.db.length} | ${fmtLines(wireSum)} |`);
  }
  lines.push('');

  // Per-dispatcher detail
  for (const d of dispatchers) {
    const g = groups[d];
    lines.push(`## ${d}`);
    lines.push('');
    if (g.wire.length === 0 && g.db.length === 0) {
      lines.push('_No modules._');
      lines.push('');
      continue;
    }
    if (g.wire.length > 0) {
      lines.push(`### WIRE_CANDIDATE (top ${Math.min(g.wire.length, TOP_PER_DISPATCHER)} of ${g.wire.length})`);
      lines.push('');
      lines.push('| Lines | Name | Path | Type |');
      lines.push('|---:|---|---|---|');
      for (const m of g.wire.slice(0, TOP_PER_DISPATCHER)) {
        lines.push(`| ${fmtLines(m.lines)} | ${m.name} | \`${m.source_stockpile}/${m.path}\` | ${m.type} |`);
      }
      lines.push('');
    }
    if (g.db.length > 0) {
      lines.push(`### DATABASE (top ${Math.min(g.db.length, TOP_PER_DISPATCHER)} of ${g.db.length})`);
      lines.push('');
      lines.push('| Lines | Name | Path |');
      lines.push('|---:|---|---|');
      for (const m of g.db.slice(0, TOP_PER_DISPATCHER)) {
        lines.push(`| ${fmtLines(m.lines)} | ${m.name} | \`${m.source_stockpile}/${m.path}\` |`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

function writeAtomic(p, body) {
  const tmp = `${p}.tmp.${process.pid}`;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(tmp, body);
  fs.renameSync(tmp, p);
}

function main() {
  if (!fs.existsSync(CLASSIFIED)) {
    console.error(`FATAL: ${CLASSIFIED} missing`);
    process.exit(2);
  }
  const doc = JSON.parse(fs.readFileSync(CLASSIFIED, 'utf8'));
  const body = buildReport(doc);
  writeAtomic(OUT, body);
  console.log(`ok: wrote ${OUT} (${body.length} chars)`);
}

main();
