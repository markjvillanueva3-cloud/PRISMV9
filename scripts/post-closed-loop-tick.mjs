#!/usr/bin/env node
// post-closed-loop-tick.mjs — ONE iteration of the post-processor self-improving closed loop. slot:echo.
//
// The closed loop the goal targets:  generate NC  →  VERIFY (conformance)  →  SCORE  →  LEARN
// (record deviations as the improvement signal)  →  regenerate better.  This script runs the
// VERIFY → SCORE → LEARN legs LIVE on an already-generated NC and appends the result to a durable
// learning ledger. When MCP is up, the GENERATE leg (post-processor) feeds a fresh NC into each
// tick; the verify/score/learn backbone here is unchanged and already functional.
//
// The ledger (state/shared/post-closed-loop-ledger.jsonl) is the self-learning system's memory:
// each row is one scored generation. A perfect row (score 1.0, no deviations) confirms the post +
// SFC math agree. A row with deviations carries the EXACT (check, expected, actual) the next
// generation must fix — that is the training signal, not a vague reward.
//
// Usage: node scripts/post-closed-loop-tick.mjs <nc-file> [--program rich|basic] [--ledger <path>]
// Exit 0 always (a tick that records a LOW score is a successful tick — the loop learned something).

import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNC, checkConformance } from './post-nc-conformance.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const DEFAULT_LEDGER = resolve(REPO, 'state/shared/post-closed-loop-ledger.jsonl');

/**
 * Build one closed-loop ledger entry from a conformance result. Pure — `nowIso` is injected so
 * the caller stamps the time (keeps the function deterministic + testable). `deviations` is the
 * improvement signal: only the FAILED checks, each with its expected vs actual.
 */
export function buildLedgerEntry(result, nowIso, source = {}) {
  const deviations = result.checks
    .filter((c) => !c.pass)
    .map((c) => ({ check: c.name, expected: c.expected, actual: c.actual, detail: c.detail || null }));
  return {
    ts: nowIso,
    file: result.file ?? source.file ?? null,
    program: result.program,
    score: result.score,
    passed: result.passed,
    total: result.total,
    conforming: result.ok,
    deviations,            // [] when perfect; otherwise the exact training signal
    generator: source.generator ?? 'pre-generated', // 'pre-generated' until the MCP post leg feeds live
  };
}

/** Summarize the learning signal for the operator/console. */
export function describeSignal(entry) {
  if (entry.conforming) return `✓ conforming (score ${(entry.score * 100).toFixed(0)}%) — post output agrees with SFC/spec math; nothing to correct.`;
  const lines = entry.deviations.map((d) => `  ✗ ${d.check}: expected ${d.expected}, got ${d.actual}`);
  return `△ ${entry.deviations.length} deviation(s) — improvement signal for next generation:\n${lines.join('\n')}`;
}

async function main() {
  const argv = process.argv.slice(2);
  const file = argv.find((a) => !a.startsWith('--'));
  const pIdx = argv.indexOf('--program');
  const program = pIdx >= 0 ? argv[pIdx + 1] : 'rich';
  const lIdx = argv.indexOf('--ledger');
  const ledger = lIdx >= 0 ? argv[lIdx + 1] : DEFAULT_LEDGER;
  if (!file) { console.error('usage: post-closed-loop-tick.mjs <nc-file> [--program rich|basic] [--ledger <path>]'); process.exit(2); }

  const spec = await import('./lib/prism-base-job.mjs');
  let text;
  try { text = readFileSync(file, 'utf8'); }
  catch (e) { console.error(JSON.stringify({ ok: false, error: `cannot read ${file}: ${e.message}` })); process.exit(2); }

  const result = checkConformance(parseNC(text), spec, program);
  result.file = file;
  const entry = buildLedgerEntry(result, new Date().toISOString(), { file, generator: 'pre-generated' });

  mkdirSync(dirname(ledger), { recursive: true });
  appendFileSync(ledger, JSON.stringify(entry) + '\n', 'utf8');

  console.log(`[closed-loop tick] ${entry.file} [${entry.program}] @ ${entry.ts}`);
  console.log(describeSignal(entry));
  console.log(`recorded → ${ledger}`);
  process.exit(0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
