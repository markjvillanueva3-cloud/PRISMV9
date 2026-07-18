#!/usr/bin/env node
// scripts/generate-extracted-modules-wire-queue.mjs
//
// Derives state/shared/extracted-modules-wire-queue.json from the classified
// manifest — a pick-unit-shaped queue of the top-K WIRE_CANDIDATEs ready to
// be absorbed into PRISM dispatchers as new engines (slot:papa /loop iter2,
// closing U-EXTRACTED-FORGE-PICKUP from iter1's follow-up list).
//
// Output schema (one row per candidate):
//   { unit_id, source_path, source_stockpile, name, type, est_lines,
//     recommended_dispatcher, confidence, why }
//
// unit_id format: U-ABSORB-<TYPE>-<SAFE-NAME> (e.g. U-ABSORB-AI_ML-PRISM_PSO_OPTIMIZER)
//   — pick-unit reads atomic-roadmap.json units; this queue is OFFERED to the
//   priority-queue picker as a side-channel via its own JSON.
//
// CLI:  node scripts/generate-extracted-modules-wire-queue.mjs [--top 50]
//
// Karpathy:
//   CLASSIFY  — filter to WIRE_CANDIDATE + sort by line-count desc
//   EDGE CASES — empty classified → exit 0 + warn (cold-start) · cap at 200 default
//   FAILURE   — atomic .tmp + rename

import fs from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = '1.0.0';
const ROOT = 'H:/PRISM';
const CLASSIFIED = path.join(ROOT, 'state/shared/extracted-modules-classified.json');
const OUT = path.join(ROOT, 'state/shared/extracted-modules-wire-queue.json');
const DEFAULT_TOP = 50;

function safe(s) { return String(s).toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 60); }

function unitIdFor(mod) {
  return `U-ABSORB-${safe(mod.type)}-${safe(mod.name)}`;
}

function buildWhy(mod) {
  const reasons = [];
  reasons.push(`${mod.lines.toLocaleString()}-line ${mod.type} module from monolith v8.89`);
  if (mod.match_confidence > 0.3) {
    reasons.push(`partial overlap with ${mod.matched_engine} (J=${mod.match_confidence})`);
  } else {
    reasons.push('no existing PRISM engine matches name');
  }
  reasons.push(`route to ${mod.recommended_dispatcher}`);
  return reasons.join(' · ');
}

export function buildQueue(classifiedDoc, top = DEFAULT_TOP) {
  const wire = (classifiedDoc.modules || [])
    .filter(m => m.dup_status === 'WIRE_CANDIDATE')
    .sort((a, b) => b.lines - a.lines)
    .slice(0, top);
  return wire.map(m => ({
    unit_id: unitIdFor(m),
    source_path: m.path,
    source_stockpile: m.source_stockpile,
    name: m.name,
    type: m.type,
    est_lines: m.lines,
    recommended_dispatcher: m.recommended_dispatcher,
    confidence: m.match_confidence,
    why: buildWhy(m),
  }));
}

function writeAtomic(p, data) {
  const tmp = `${p}.tmp.${process.pid}`;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, p);
}

function parseArgs(argv) {
  const out = { top: DEFAULT_TOP };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--top' && argv[i + 1]) { out.top = Number.parseInt(argv[i + 1], 10) || DEFAULT_TOP; i++; }
  }
  return out;
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!fs.existsSync(CLASSIFIED)) {
    console.error(`FATAL: classified manifest missing — ${CLASSIFIED}`);
    console.error('  Run: node scripts/build-extracted-modules-manifest.mjs');
    console.error('       node scripts/classify-extracted-modules.mjs');
    process.exit(2);
  }
  const doc = JSON.parse(fs.readFileSync(CLASSIFIED, 'utf8'));
  const queue = buildQueue(doc, args.top);
  const result = {
    schemaVersion: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    source: CLASSIFIED,
    top: args.top,
    queue,
    summary: {
      total: queue.length,
      by_dispatcher: queue.reduce((acc, q) => { acc[q.recommended_dispatcher] = (acc[q.recommended_dispatcher] || 0) + 1; return acc; }, {}),
      by_type: queue.reduce((acc, q) => { acc[q.type] = (acc[q.type] || 0) + 1; return acc; }, {}),
      total_lines: queue.reduce((s, q) => s + q.est_lines, 0),
    },
  };
  writeAtomic(OUT, result);
  console.log(JSON.stringify({
    ok: true,
    out: OUT,
    top: args.top,
    total: queue.length,
    total_lines: result.summary.total_lines,
    by_dispatcher: result.summary.by_dispatcher,
  }, null, 2));
}

import { pathToFileURL } from 'node:url';
const isDirectRun = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) main();
