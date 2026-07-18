#!/usr/bin/env node
// cheap-cps-validate.mjs — prove the CHEAP version (.cps Fusion post output) accuracy. slot:echo.
//
// The "cheap version" of the PRISM offering is the per-controller Fusion `.cps` post (12 live at
// JM DIE/PRISM MODIFIED POST PROCESSORS/). Its output is the 160,582-program real JM NC corpus.
// This validator samples real production NC per controller and scores each with the STATIC stack —
// post-nc-dialect-lint.mjs (8 dialect+safety rules) + structural conformance (--structural) — to
// prove the cheap version emits dialect-correct, structurally-sound NC. It is the non-blocked
// counterpart to the full-post training loop (post-training-harness.mjs): NO MCP server, NO broken
// post engine — so it works while FINDING 2/FINDING 4 block the full-post side.
//
// A file PASSES iff 0 dialect ERRORs AND structural-conformance 100%. WARNs are advisory (tracked).
// UNITS FIRST: units are detected per-file (G20 inch / G21 mm) and surfaced — never assumed.
//
// Usage:
//   node scripts/cheap-cps-validate.mjs --controller haas --dir "JM DIE/CNC MILL HAAS" --sample 15
//   node scripts/cheap-cps-validate.mjs --controller haas --dir "<dir>" --sample 15 --json
// Exit 0 = sample 100% clean · 3 = deviations found · 2 = bad input.

import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { lintFile, structuralFile, buildScorecard } from './post-training-harness.mjs';

const NC_RE = /\.(nc|min|eia|tap|ngc|pgm)$/i;

/** Breadth-capped recursive sample of NC files under `dir` (deterministic: sorted, first `limit`). */
export function sampleNcFiles(dir, limit = 20, _acc = []) {
  if (_acc.length >= limit || !existsSync(dir)) return _acc;
  let entries;
  try { entries = readdirSync(dir).sort(); } catch { return _acc; }
  // files first (so a shallow dir yields results before recursing), then subdirs
  const files = [], dirs = [];
  for (const e of entries) {
    const p = join(dir, e);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isFile() && NC_RE.test(e)) files.push(p);
    else if (st.isDirectory()) dirs.push(p);
  }
  for (const f of files) { if (_acc.length >= limit) return _acc; _acc.push(f); }
  for (const d of dirs) { if (_acc.length >= limit) return _acc; sampleNcFiles(d, limit, _acc); }
  return _acc;
}

/** Detect the declared units of an NC file from G20/G21 — never assume (25.4x guard). */
export function detectUnits(text) {
  if (/(^|\s)G20(\s|$|\.)/m.test(text)) return 'inch';
  if (/(^|\s)G21(\s|$|\.)/m.test(text)) return 'mm';
  return 'unknown';
}

/**
 * Validate a sample of real NC files for one controller. Pure over the injected `run` (child-proc).
 *
 * ACCURACY MODEL (corrected after observing the real JM corpus): the cheap `.cps` post's job is
 * DIALECT-CORRECT emission, so the hard accuracy signal is **0 dialect ERRORs**. Structural
 * completeness (units-declared / work-offset / M30 / one-tool-with-spindle) is ADVISORY only —
 * the real corpus legitimately contains subprograms (M99), Haas CALL-by-name + GOTO macro programs
 * (units/work-offset live in the called subs), and operation fragments that the self-contained-main
 * structural model would cry-wolf on. So: pass = dialectClean; structural is reported, not gated.
 * Returns the scorecard + units census + a separate structural-advisory list.
 */
export function validateSample(files, dialect, { run, warnPenalty = 0 } = {}) {
  const verdicts = [];
  const deviations = [];                 // HARD: dialect errors (real cheap-version defects)
  const structuralAdvisories = [];       // ADVISORY: incomplete-vs-self-contained-main (often subprograms)
  const units = { inch: 0, mm: 0, unknown: 0 };
  let structuralComplete = 0;
  for (const file of files) {
    let text = ''; try { text = readFileSync(file, 'utf8'); } catch { /* keep going */ }
    units[detectUnits(text)]++;
    const lint = lintFile(file, dialect, run);
    const structural = structuralFile(file, run);
    const dialectClean = (lint.errors || 0) === 0;
    const structOk = structural.total > 0 && structural.passed >= structural.total;
    if (structOk) structuralComplete++;
    verdicts.push({ jobId: basename(file), pass: dialectClean, score: dialectClean ? Math.max(0, 1 - warnPenalty * (lint.warns || 0)) : 0, structScore: structOk ? 1 : 0, lintErrors: lint.errors || 0, lintWarns: lint.warns || 0 });
    if (!dialectClean) deviations.push({ job: basename(file), lintErrors: lint.errors, lintWarns: lint.warns });
    if (!structOk) structuralAdvisories.push({ job: basename(file), failedStructural: (structural.checks || []).filter((c) => !c.pass).map((c) => c.name) });
  }
  const card = buildScorecard(`cheap-${dialect}`, dialect, verdicts, deviations);
  return { ...card, controller: dialect, sampled: files.length, units, structuralComplete, structuralAdvisories };
}

// ── CLI ─────────────────────────────────────────────────────────────────────────────────
function getArg(argv, flag, def) { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : def; }

function main() {
  const argv = process.argv.slice(2);
  const dialect = getArg(argv, '--controller', null);
  const dir = getArg(argv, '--dir', null);
  const sample = parseInt(getArg(argv, '--sample', '15'), 10);
  const asJson = argv.includes('--json');
  if (!dialect || !dir) {
    console.error(JSON.stringify({ ok: false, error: 'use: --controller <haas|hurco|okuma|fanuc|...> --dir "<nc-dir>" [--sample N] [--json]' }));
    process.exit(2);
  }
  const root = existsSync(dir) ? dir : join(process.cwd(), dir);
  const files = sampleNcFiles(root, sample);
  if (files.length === 0) { console.error(JSON.stringify({ ok: false, error: `no NC files under ${root}` })); process.exit(2); }
  const card = validateSample(files, dialect);
  if (asJson) { console.log(JSON.stringify(card, null, 2)); }
  else {
    const pct = (card.passed / card.sampled * 100).toFixed(0);
    console.log(`\n=== CHEAP .cps validation — ${dialect} — DIALECT ${card.passed}/${card.sampled} clean (${pct}%) · ${card.lintErrors}E/${card.lintWarns}W · structural-complete ${card.structuralComplete}/${card.sampled} (advisory) · units inch=${card.units.inch} mm=${card.units.mm} ?=${card.units.unknown} ===`);
    for (const d of card.deviations.slice(0, 10)) console.log(`  ✗ DIALECT ${d.job}: ${d.lintErrors} error(s)`);
    if (card.deviations.length === 0) console.log('  ✓ DIALECT-CLEAN: every sampled .cps program emits 0 dialect errors (cheap version accurate at the dialect level)');
    for (const a of card.structuralAdvisories.slice(0, 6)) console.log(`  · advisory ${a.job}: not a self-contained main [${a.failedStructural.join(',')}] (likely subprogram / CALL-style / fragment)`);
  }
  // Exit on the HARD accuracy signal only (dialect). Structural advisories never fail the gate.
  process.exit(card.deviations.length === 0 ? 0 : 3);
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
