/**
 * eval-wedm-print2program.mjs — Phase D3: grade print->program GENERATIONS
 * through the Phase C closed-loop gate stack. This is the eval gate that closes
 * the loop: a generated program is ACCEPTED only if every present gate passes.
 *
 * Per WEDM-PRINT-TO-PROGRAM-PIPELINE-2026-05-31.md §4-5. Reuses the Phase C
 * runner (wedm-program-test-gates.mjs) verbatim — no re-implementation. Pure-core
 * grader + injected reader (a JSONL of generations). No template-${...}.
 *
 *   node scripts/eval-wedm-print2program.mjs <generations.jsonl> [--floor 0.9]
 *
 * Each generation row may carry:
 *   { generated|output: "<schedule text>", taper?, expected?,
 *     envelopeResult?, inventoryResult?, safetyResult?, dimensionalResult?, postLintResult? }
 * The cascade gate runs on the text here; the other gates are graded from any
 * pre-computed results the row carries (the TS pipeline supplies those).
 *
 * @module scripts/eval-wedm-print2program
 */
import * as fs from "node:fs";
import { runClosedLoopTest } from "./lib/wedm-program-test-gates.mjs";

/** Strip a leading "Toolpath type: ..." header line if present; else return as-is. */
function scheduleTextOf(row) {
  const s = String(row.generated ?? row.output ?? "");
  return /^Toolpath type:/.test(s) && s.includes("\n") ? s.slice(s.indexOf("\n") + 1) : s;
}

/**
 * Grade an array of generation rows through the closed-loop gate stack.
 * Pure — no I/O. Returns the aggregate eval record.
 */
export function gradeGenerations(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const byFailedGate = {};
  const verdicts = [];
  let accepted = 0;
  for (const row of list) {
    const v = runClosedLoopTest({
      scheduleText: scheduleTextOf(row),
      taper: row.taper,
      expected: row.expected,
      envelopeResult: row.envelopeResult,
      inventoryResult: row.inventoryResult,
      safetyResult: row.safetyResult,
      dimensionalResult: row.dimensionalResult,
      postLintResult: row.postLintResult,
    });
    if (v.pass) accepted += 1;
    for (const g of v.failed_gates) byFailedGate[g] = (byFailedGate[g] ?? 0) + 1;
    verdicts.push({ pass: v.pass, failed_gates: v.failed_gates, total: v.total });
  }
  const n = list.length;
  return {
    n,
    accepted,
    rejected: n - accepted,
    accept_rate: n === 0 ? 0 : accepted / n,
    by_failed_gate: byFailedGate,
    verdicts,
  };
}

/**
 * Fail-loud eval gate: throw if accept_rate is below `floor`. Returns the result
 * unchanged when it passes (or when floor is null/undefined => report-only).
 */
export function assertAcceptRate(result, floor) {
  if (floor == null) return result;
  if (result.n === 0) throw new Error("[eval-p2p] FATAL: 0 generations to grade");
  if (result.accept_rate < floor) {
    throw new Error("[eval-p2p] FAIL: accept_rate " + result.accept_rate.toFixed(3) + " < floor " + floor + " (" + result.accepted + "/" + result.n + " accepted; top failed gates " + JSON.stringify(result.by_failed_gate) + ")");
  }
  return result;
}

function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const fi = args.indexOf("--floor");
  const floor = fi >= 0 && args[fi + 1] != null ? Number(args[fi + 1]) : null;
  if (!file) { console.error("usage: node scripts/eval-wedm-print2program.mjs <generations.jsonl> [--floor 0.9]"); process.exit(2); }
  let txt = "";
  try { txt = fs.readFileSync(file, "utf8").trim(); } catch (e) { console.error("[eval-p2p] FATAL: cannot read " + file + ": " + e.message); process.exit(2); }
  const rows = txt ? txt.split("\n").map((l) => JSON.parse(l)) : [];
  const r = gradeGenerations(rows);
  console.log("=== WEDM PRINT->PROGRAM EVAL (Phase D3) ===");
  console.log(JSON.stringify({ n: r.n, accepted: r.accepted, rejected: r.rejected, accept_rate: Number(r.accept_rate.toFixed(4)), by_failed_gate: r.by_failed_gate }, null, 2));
  try { assertAcceptRate(r, floor); } catch (e) { console.error(String(e.message)); process.exit(1); }
  console.log("[eval-p2p] OK — " + r.accepted + "/" + r.n + " programs accepted through the closed-loop gate stack" + (floor != null ? " (floor " + floor + " met)" : " (report-only)"));
}

// Run only when invoked directly (not when imported by the test).
if (process.argv[1] && process.argv[1].endsWith("eval-wedm-print2program.mjs")) main();
