#!/usr/bin/env node
/**
 * run-hypercad-validation.mjs -- CAD-DRAW-MAX-MS1 / U-VALIDATION-50 (thin CLI)
 *
 * SUPERSEDED 2026-06-27 (slot:delta, U-DELTA-VAL50-SUPERSEDE): this script used to INLINE a
 * 12-case corpus + a PROBABILISTIC stub orchestrator (a plausible-but-FAKE baseline) + its own
 * scorer, and wrote markdown only. That fake-baseline is exactly the gate-gaming class fixed in
 * U-DELTA-VAL50-DRIVER. It is now a thin CLI over the honest, tested driver lib
 * (scripts/lib/cad-validation-50-driver.mjs): it routes through the REAL corpus + REAL harness via
 * runValidation50, which emits an honest gate-aware JSON (a stub/12-case run is NEVER gate-eligible
 * and writes a NON gate-probed baseline name -- it cannot flip the existence-only T2 detector). This
 * script additionally renders the dashboard markdown (CAD-DRAW-MAX-MS1-BASELINE.md) from that JSON.
 *
 * The old probabilistic-model logic is retired (recoverable in git history) -- a fake baseline behind
 * a flag would preserve the gaming-class problem, so it is not kept. The lib's deterministic `stub`
 * orchestrator is the honest reproducible default; `--orchestrator live` runs the real hyperCAD-S seat
 * (the ONLY mode that yields a real number; headless = MOCK).
 *
 * Runtime: the lib dynamic-imports .ts corpus/harness, so this self-reexecs under `tsx` when launched
 * with plain `node` (Node-24 .js->.ts dynamic-import trap; PRISM_HCV_REEXEC breaks the loop).
 *
 * Usage:   node scripts/run-hypercad-validation.mjs [--orchestrator stub|mock|live] [--domain all|mill|lathe|wedm]
 * Exit:    0 = report written + gate passed | 1 = report written + gate FAILED | 2 = error
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(SELF), "..");

// -- tsx self-reexec (the lib pulls in .ts imports; works whether launched via node or tsx) --
const underTsx = process.execArgv.some((a) => a.includes("tsx")) ||
  Object.keys(process.env).some((k) => k === "TSX" || k.startsWith("TSX_")) ||
  /[\\/](tsx|esbuild)[\\/]/.test(process.env._ ?? "");
if (!underTsx && process.env.PRISM_HCV_REEXEC !== "1") {
  const r = spawnSync("npx", ["tsx", SELF, ...process.argv.slice(2)], {
    stdio: "inherit", env: { ...process.env, PRISM_HCV_REEXEC: "1" }, shell: process.platform === "win32",
  });
  process.exit(typeof r.status === "number" ? r.status : 2);
}

const { runValidation50, parseArgs } = await import("./lib/cad-validation-50-driver.mjs");

/** Render the dashboard markdown from the driver's honest JSON result. Pure. */
function renderMarkdown(j) {
  const L = [];
  const pct = (n) => (Number(n) * 100).toFixed(1);
  L.push(`# CAD-DRAW-MAX-MS1 -- Validation Baseline Report`);
  L.push("");
  L.push(`**Verdict: ${j.passedGate ? "PASS" : "FAIL"}** -- accuracy ${pct(j.accuracy)}% vs gate ${pct(j.gate)}%`);
  L.push("");
  L.push(`- Orchestrator: **${j.orchestrator}** ${j.orchestrator === "live" ? "(real hyperCAD-S seat)" : "(MOCK/stub -- NOT a real seat measurement)"}`);
  L.push(`- Gate-eligible (flips T2): **${j.gateEligible ? "YES" : "NO"}** ${j.gateEligible ? "" : "-- a non-live or partial-corpus run never flips the existence-only T2 detector (anti-gaming)"}`);
  L.push(`- Corpus: ${j.corpus.size}/${j.corpus.target} cases (isFull: ${j.corpus.isFull})${j.corpus.size < j.corpus.target ? " -- expand via U-VALIDATION-50-EXPAND" : ""}`);
  L.push(`- Totals: ${j.totals.passed} passed / ${j.totals.failed} failed / ${j.totals.errored} errored of ${j.totals.total}`);
  L.push(`- Ran at: ${j.ranAtIso}`);
  L.push("");
  L.push(`## Per-domain accuracy`);
  L.push("");
  L.push(`| Domain | Passed | Total | Accuracy |`);
  L.push(`|---|---:|---:|---:|`);
  for (const [d, s] of Object.entries(j.perDomain)) L.push(`| ${d} | ${s.passed} | ${s.total} | ${pct(s.accuracy)}% |`);
  L.push("");
  L.push(`## Per-case verdicts`);
  L.push("");
  L.push(`| ID | Domain | Verdict | Iter | Exported | Stop | Reason |`);
  L.push(`|---|---|---|---:|---|---|---|`);
  for (const v of j.verdicts) {
    L.push(`| ${v.id} | ${v.domain ?? ""} | ${v.verdict} | ${v.iterations} | ${v.exported ? "yes" : "no"} | ${v.stopReason} | ${String(v.reason).replace(/\|/g, "\\|")} |`);
  }
  L.push("");
  L.push(`## Next steps`);
  L.push(`1. Expand corpus 12 -> 50 (U-VALIDATION-50-EXPAND) from H:/PRISM/JM DIE/FUSION CAD AND CAM FILES.`);
  L.push(`2. Live hyperCAD-S seat run (--orchestrator live) for a REAL pre-train number.`);
  L.push(`3. operator_verified eval split before any adapter promotion (T1 deploy gate).`);
  L.push("");
  return L.join("\n") + "\n";
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!["stub", "mock", "live"].includes(opts.orchestrator)) opts.orchestrator = "stub"; // dashboard default
  // runValidation50 writes the honest gate-aware JSON (non-probed baseline for a stub/partial run).
  const json = await runValidation50({ orchestrator: opts.orchestrator, domain: opts.domain, gate: opts.gate, target: opts.target, repoRoot: REPO_ROOT });
  const md = renderMarkdown(json);
  const outDir = resolve(REPO_ROOT, "state", "shared");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "CAD-DRAW-MAX-MS1-BASELINE.md"), md, "utf8");
  const day = (json.ranAtIso ?? "unknown").slice(0, 10);
  writeFileSync(resolve(outDir, `CAD-DRAW-MAX-MS1-BASELINE-${day}.md`), md, "utf8");
  process.stdout.write(`[hcv] orchestrator=${json.orchestrator} accuracy=${(json.accuracy * 100).toFixed(1)}% gate=${(json.gate * 100).toFixed(1)}% verdict=${json.passedGate ? "PASS" : "FAIL"} gateEligible=${json.gateEligible}\n`);
  if (json.__writtenTo) process.stdout.write(`[hcv] json: ${json.__writtenTo}\n`);
  process.stdout.write(`[hcv] md:   state/shared/CAD-DRAW-MAX-MS1-BASELINE.md\n`);
  process.exit(json.passedGate ? 0 : 1);
}

main().catch((e) => { process.stderr.write(`[hcv] FAILED: ${e && e.message ? e.message : String(e)}\n`); process.exit(2); });
