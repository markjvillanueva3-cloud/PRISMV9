#!/usr/bin/env node
// post-closed-loop-correct.mjs — the REGENERATE/IMPROVE leg that CLOSES the self-improving loop. slot:echo.
//
// The closed loop:  generate → VERIFY → SCORE → LEARN (deviations) → REGENERATE-BETTER → (repeat).
// post-closed-loop-tick.mjs runs verify→score→learn. THIS runs the regenerate-better leg: it
// consumes the deviation training-signal from conformance and produces a CORRECTED NC, then
// re-verifies to PROVE the score improved. That is what makes the loop self-improving rather than
// a one-shot check — a generation that scored <100% is corrected and re-scored, and the ledger
// shows the improvement curve.
//
// Honest scope: the corrections here are deterministic, derived from the deviation's
// (expected, actual) — i.e. "emit the value the SFC/spec math says." That is exactly the
// post-processor's job; the loop's VALUE is DETECTING a real post error (wrong rpm, wrong units,
// wrong WCS from a units/lookup bug) and FIXING it. The corrector does NOT invent the target — it
// applies the verified-correct spec value the verifier independently checks against. When MCP is
// up, the "expected" comes from a live cam_speedfeed_compute instead of the spec table; the
// correction mechanism is unchanged.
//
// Usage: node scripts/post-closed-loop-correct.mjs <nc-file> [--program rich|basic] [--out <path>] [--ledger <path>]
// Exit 0 if the corrected NC conforms (or the input already conformed); exit 3 if it still fails.

import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNC, checkConformance, liveSfcLeg } from './post-nc-conformance.mjs';
import { buildLedgerEntry } from './post-closed-loop-tick.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const DEFAULT_LEDGER = resolve(REPO, 'state/shared/post-closed-loop-ledger.jsonl');

/**
 * Translate conformance deviations into concrete correction directives. Pure.
 * Handles the deviation classes the corrector can deterministically fix from (expected, actual):
 * units (G21→G20), work-offset (wrong G5x → spec), spindle-speed-T<n> (S<actual> → S<expected>).
 */
export function deriveCorrections(deviations) {
  const corrections = [];
  for (const d of deviations) {
    if (d.check === 'units') {
      corrections.push({ type: 'units', to: 'G20', wrong: 'G21' });
    } else if (d.check === 'work-offset' && typeof d.actual === 'string' && /^G5[4-9]$/.test(d.actual)) {
      corrections.push({ type: 'work-offset', from: d.actual, to: d.expected });
    } else {
      const sm = d.check.match(/^spindle-speed-T(\d+)$/);
      if (sm && typeof d.actual === 'number' && typeof d.expected === 'number') {
        corrections.push({ type: 'spindle-speed', tool: Number(sm[1]), from: d.actual, to: d.expected });
      }
    }
  }
  return corrections;
}

const stripParen = (l) => l.replace(/\([^)]*\)/g, ' ');

/** Apply correction directives to NC text. Pure. Spindle-speed edits are scoped to the right tool block. */
export function applyCorrections(ncText, corrections) {
  let lines = String(ncText).split(/\r?\n/);
  const applied = [];
  for (const c of corrections) {
    if (c.type === 'units') {
      lines = lines.map((l) => l.replace(/\bG21\b/g, 'G20'));
      applied.push('units→G20');
    } else if (c.type === 'work-offset') {
      let done = false;
      lines = lines.map((l) => {
        if (done) return l;
        const r = l.replace(new RegExp('\\b' + c.from + '\\b'), c.to);
        if (r !== l) { done = true; applied.push(`${c.from}→${c.to}`); }
        return r;
      });
    } else if (c.type === 'spindle-speed') {
      // Replace the spindle speed AND scale every feed in the same tool block by the rpm ratio, so
      // the feed-per-tooth (chip load) the post chose is preserved at the corrected speed — a
      // corrected rpm with the original feed would over/under-feed the cut. fz = F/(rpm·z) stays
      // constant. Scoped to this tool's block; handles the post's multi-tier feeds uniformly.
      const ratio = c.from ? c.to / c.from : 1;
      let inBlock = false, sDone = false, feedsScaled = false;
      lines = lines.map((l) => {
        const tHere = stripParen(l).match(/\bT(\d+)\b/);
        if (tHere) inBlock = Number(tHere[1]) === c.tool;
        if (!inBlock) return l;
        let out = l;
        if (!sDone) {
          const r = out.replace(new RegExp('\\bS' + c.from + '\\b'), 'S' + c.to);
          if (r !== out) { out = r; sDone = true; applied.push(`T${c.tool} S${c.from}→S${c.to}`); }
        }
        if (c.scaleFeeds !== false && ratio !== 1 && ratio > 0) {
          out = out.replace(/\bF(\d+(?:\.\d+)?)\b/g, (_, f) => { feedsScaled = true; return 'F' + (Number(f) * ratio).toFixed(3); });
        }
        return out;
      });
      if (feedsScaled) applied.push(`T${c.tool} feeds ×${ratio.toFixed(3)} (chip load preserved)`);
    }
  }
  return { text: lines.join('\n'), applied };
}

/** One full regenerate-better pass: verify → (if deviations) correct → re-verify. Pure given spec. */
export function correctOnce(ncText, spec, programName) {
  const before = checkConformance(parseNC(ncText), spec, programName);
  if (before.ok) return { before, after: before, corrections: [], applied: [], correctedText: ncText, improved: false };
  const corrections = deriveCorrections(before.checks.filter((c) => !c.pass).map((c) => ({ check: c.name, expected: c.expected, actual: c.actual })));
  const { text, applied } = applyCorrections(ncText, corrections);
  const after = checkConformance(parseNC(text), spec, programName);
  return { before, after, corrections, applied, correctedText: text, improved: after.score > before.score };
}

/**
 * Derive spindle-speed corrections from the LIVE SFC leg: for each MILL tool whose emitted rpm
 * drifts outside tolerance, target the SFC-computed rpm. The DRILL is skipped — the SFC drill
 * operation-path is unreliable (returns milling Vc; see reference_sfc_speed_feed_bugs_2026_05_31).
 * Pure given the liveLeg result + spec.
 */
export function deriveSfcCorrections(liveLeg, spec) {
  if (!liveLeg || !liveLeg.ran) return { corrections: [], skipped: [] };
  const corrections = [], skipped = [];
  for (const c of liveLeg.checks) {
    if (c.error || c.withinTol || c.sfcRpm == null) continue;
    const tool = spec.toolByNum(c.tool);
    if (tool && /drill/i.test(tool.type)) { skipped.push({ tool: c.tool, reason: 'drill — SFC op-path unreliable' }); continue; }
    corrections.push({ type: 'spindle-speed', tool: c.tool, from: c.ncRpm, to: Math.round(c.sfcRpm) });
  }
  return { corrections, skipped };
}

/** Regenerate-better using the LIVE SFC as the speed target (mills only). Closes the loop on physics. */
export async function correctFromSfc(ncText, spec, programName, opts = {}) {
  const leg = await liveSfcLeg(parseNC(ncText), spec, programName, opts);
  if (!leg.ran) return { ran: false, reason: leg.reason, correctedText: ncText, applied: [], skipped: [] };
  const { corrections, skipped } = deriveSfcCorrections(leg, spec);
  const { text, applied } = applyCorrections(ncText, corrections);
  const after = await liveSfcLeg(parseNC(text), spec, programName, opts);
  return { ran: true, before: leg, after, corrections, applied, skipped, correctedText: text };
}

async function main() {
  const argv = process.argv.slice(2);
  const file = argv.find((a) => !a.startsWith('--'));
  const pIdx = argv.indexOf('--program');
  const program = pIdx >= 0 ? argv[pIdx + 1] : 'rich';
  const oIdx = argv.indexOf('--out');
  const lIdx = argv.indexOf('--ledger');
  const ledger = lIdx >= 0 ? argv[lIdx + 1] : DEFAULT_LEDGER;
  if (!file) { console.error('usage: post-closed-loop-correct.mjs <nc-file> [--program] [--out] [--ledger]'); process.exit(2); }

  const spec = await import('./lib/prism-base-job.mjs');
  let text;
  try { text = readFileSync(file, 'utf8'); }
  catch (e) { console.error(JSON.stringify({ ok: false, error: `cannot read ${file}: ${e.message}` })); process.exit(2); }

  // --sfc: regenerate mill speeds toward the LIVE SFC (closes the loop on physics, not the static spec).
  if (argv.includes('--sfc')) {
    const s = await correctFromSfc(text, spec, program);
    if (!s.ran) { console.log(`[regenerate-from-SFC] ${file}: SFC unreachable (${s.reason})`); process.exit(2); }
    console.log(`[regenerate-from-SFC] ${file} [${program}] — mills targeted to live SFC, drill skipped`);
    for (const c of s.before.checks) {
      if (c.sfcRpm == null) continue;
      console.log(`  T${c.tool}: emitted S${c.ncRpm} → SFC ${Math.round(c.sfcRpm)} (${(c.deltaPct * 100).toFixed(0)}% drift)`);
    }
    console.log(`  applied: ${s.applied.join(', ') || '(none — all within tolerance)'}`);
    if (s.skipped.length) console.log(`  skipped: ${s.skipped.map((k) => `T${k.tool} (${k.reason})`).join(', ')}`);
    const afterDrift = s.after.checks.filter((c) => c.withinTol === false && !c.error).length;
    console.log(`  after: ${afterDrift} tool(s) still out of tolerance (the skipped drill stays out by design)`);
    if (oIdx >= 0) { writeFileSync(argv[oIdx + 1], s.correctedText, 'utf8'); console.log(`  corrected NC → ${argv[oIdx + 1]}`); }
    process.exit(0);
  }

  const r = correctOnce(text, spec, program);
  const now = new Date().toISOString();

  mkdirSync(dirname(ledger), { recursive: true });
  // Record BOTH loop iterations so the ledger shows the improvement curve.
  r.before.file = file;
  appendFileSync(ledger, JSON.stringify(buildLedgerEntry(r.before, now, { file, generator: 'pre-correction' })) + '\n', 'utf8');
  if (!r.before.ok) {
    r.after.file = (oIdx >= 0 ? argv[oIdx + 1] : file) + (oIdx >= 0 ? '' : '.corrected');
    appendFileSync(ledger, JSON.stringify(buildLedgerEntry(r.after, now, { file: r.after.file, generator: 'corrected' })) + '\n', 'utf8');
  }

  if (oIdx >= 0 && !r.before.ok) writeFileSync(argv[oIdx + 1], r.correctedText, 'utf8');

  console.log(`[regenerate-better] ${file} [${program}]`);
  console.log(`  before: ${(r.before.score * 100).toFixed(0)}% (${r.before.passed}/${r.before.total})`);
  if (r.before.ok) { console.log('  already conforming — nothing to correct.'); process.exit(0); }
  console.log(`  applied: ${r.applied.join(', ') || '(none — deviations not auto-correctable)'}`);
  console.log(`  after:  ${(r.after.score * 100).toFixed(0)}% (${r.after.passed}/${r.after.total})  ${r.improved ? '↑ IMPROVED' : '— no improvement'}`);
  if (oIdx >= 0) console.log(`  corrected NC → ${argv[oIdx + 1]}`);
  process.exit(r.after.ok ? 0 : 3);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
