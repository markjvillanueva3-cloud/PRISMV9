#!/usr/bin/env node
// ai-systems-synergy-goal-gate.mjs
//
// ===========================================================================
// GOAL EQUIVALENCE DECLARATION (authoritative, binding for THIS + every future
// firing of the goal -- the explicit pre-commitment the goal-keeper requires):
//
//   The recurring /goal -- "improve ai systems (deep learning / deep reasoning /
//   nn / gnn / lora / cag + rag + hybrids) across all galaxies AND ensure they
//   are all synergized with obsidian vault / hermes / psn / prism awareness /
//   CLAUDE.md / SOUL.md / MEMORY.md / memories / wikis across all galaxies" --
//   IS DEFINED AS SATISFIED **IF AND ONLY IF** `runGateFromDisk().pass === true`
//   (this CLI exits 0).
//
//   This binds every ambiguous prose clause to a deterministic leg:
//     "improve ai systems / nn/gnn/lora/cag+rag/deep-*"  <=> LEG-C (GNN deploy-
//        ready-selective) + LEG-B (LoRA data-complete) + LEG-D (CAG cold-anchor
//        coverage >= 95%) + the live reasoning-bridge that LEG-A's audit scores.
//     "ensure they are all synergized with vault/awareness/CLAUDE/SOUL/MEMORY/
//        wiki across all galaxies"                        <=> LEG-A (gaps==0, N/N,
//        audit FRESH <=PRISM_AISYN_GATE_MAX_AGE_H on the disk path -- U-LEGA-FRESHNESS).
//   "utilize new loop knowledge / hermes agentic coding" is a METHOD directive
//   (verify-before-build, coordinate-don't-duplicate, route mechanical work
//   locally), NOT an outcome -- it is therefore NOT a gate leg (a method cannot
//   be a stop-criterion; R12-honest). The gate scores the OUTCOME.
//
//   Out-of-scope residual (reported, NOT part of the iff): GNN full-coverage =
//   ref-pool growth (india-owned data/GPU). It is named + assigned, never a
//   silent gap, and explicitly excluded from the equivalence above.
//
//   NAMED residual (R12, follow-up U-LEGBC-FRESHNESS): LEG-B (fleet-lora-combined
//   .jsonl) and LEG-C (NN-EVAL.json) read file artifacts with NO age guard -- a
//   stale NN-EVAL misled a consumer once (CLAUDE.md SS NN-GRAPH, May-16 incident).
//   Their regen cadences are days-to-weeks (dataset growth / GPU retrain), so the
//   24h LEG-A ceiling would false-FAIL them; gating needs operator-named ceilings
//   (none exist yet). Until then B/C staleness is a NAMED residual, not silent.
//
//   Decision record: knowledge/wiki/decisions/ai-systems-synergy-goal-equivalence.md
// ===========================================================================
//
// Converts the RECURRING /goal -- "improve ai systems (deep-reasoning / nn / gnn /
// lora / cag + rag + hybrids) across all galaxies + synergize with obsidian vault /
// hermes / psn / awareness / CLAUDE.md / SOUL.md / MEMORY.md / wikis" -- from
// UNBOUNDED PROSE into a DETERMINISTIC loss function (R5: a script answers
// done/not-done, NOT an LLM re-judging prose; the goal pre-flight + the goal keeper
// both demanded this). This goal has been re-fired many times (charlie/alpha/tango/
// zulu) with ad-hoc post-hoc verification each time; this is the one reusable gate.
//
// It COMPOSES the canonical state artifacts the fleet already produces -- it builds
// no new AI capability (that is india/charlie/alpha/tango's already-shipped stack).
// Each leg FAILS LOUD on a missing/malformed artifact (R12: never green on absent
// data -- a missing file is FAIL, not a silent pass).
//
// LEG-A  synergy-structure  : AI-SYNERGY-AUDIT.json -> gaps==0 AND N/N score>=1,
//        AND (disk path only) the audit is FRESH: generatedAt within
//        PRISM_AISYN_GATE_MAX_AGE_H (default 24h, 0 disables). A week-old PASS is
//        not evidence of today's synergy -- stale data != pass, the same R12 class
//        as missing data (U-LEGA-FRESHNESS 2026-06-12).
//        This IS the "synergized with vault/awareness/CLAUDE.md/SOUL.md/MEMORY.md/
//        wiki" clause -- the audit scores each galaxy on exactly those surfaces +
//        the galaxy-reasoning-bridge (PSN leg #10) + the Obsidian synthesis brain.
// LEG-B  LoRA data-complete  : fleet-lora-combined.jsonl -> >=1000 rows (trainingReady
//        floor) AND all 34 galaxies tagged.
// LEG-C  GNN deploy-ready    : NN-EVAL.json -> metrics.auroc>=0.78 AND >=1 selective
//        curve row clears BOTH brier+macroF1 gates (the production posture). NOTE the
//        field paths: auroc is `metrics.auroc` (NOT top-level / checkpointMeta), and
//        deployability is per-tau `brierClears`+`macroF1Clears` in `selective.curve`
//        (there is NO `selective.deployReady` boolean -- a 2026-06-11 reader bug that
//        false-FAILED this leg; this gate encodes the correct paths so it can't recur).
// LEG-D  CAG coverage      : cag-cold-anchor-coverage report -> overallPresenceRate
//        >= 0.95 across recent sessions (the keeper-named "CAG coverage >= 95%"). Makes
//        the "cag" synergy clause measurable + terminating (U-CAG-COVERAGE-METRIC).
//
// BOUNDED OUT-OF-SCOPE RESIDUAL (R12, reported but NOT a gate failure): GNN
// FULL-coverage (`grade.pass`) -- macro-F1/Brier at 100% coverage -- is ref-pool
// GROWTH (data + GPU), owned by india's lifecycle, not a code gap any session closes.
// The gate scores the realistic SELECTIVE production bar, surfacing full-coverage as
// an informational residual.
//
// Karpathy: CLASSIFY=deterministic aggregate-gate over existing state | TECHNIQUE=pure
// readers + threshold checks + AND, dependency-injected for hermetic tests | EDGE=
// missing file / malformed JSON / empty selective curve / 0 galaxies | FAILURE=missing
// artifact FAILS its leg (never silent-pass).

import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { buildReport as buildCagCoverage } from "./cag-cold-anchor-coverage.mjs";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
export const ARTIFACTS = {
  audit: `${PRISM}/state/shared/specs/AI-SYNERGY-AUDIT.json`,
  lora: `${PRISM}/state/shared/lora/fleet-lora-combined.jsonl`,
  nnEval: `${PRISM}/state/shared/nn-graph/NN-EVAL.json`,
};
export const EXPECTED_GALAXIES = Number(process.env.PRISM_GALAXY_COUNT) || 34;
export const LORA_READY_FLOOR = 1000;
export const GNN_AUROC_FLOOR = 0.78;
export const CAG_COVERAGE_FLOOR = 0.95; // keeper-named threshold: CAG cold-anchor coverage >= 95%
// Shared ceiling-knob resolver. trim(): a whitespace-only value Number()s to 0,
// which would silently DISABLE the check instead of defaulting (scrutiny P2
// 2026-06-12). An explicit "0" stays a deliberate disable; garbage/negative -> default.
function resolveCeiling(raw, dflt) {
  if (raw === undefined || raw.trim() === "") return dflt;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : dflt;
}
// LEG-A freshness ceiling (hours). The audit regenerates in seconds
// (audit-ai-synergy.mjs), so 24h is generous; 0 disables (back-compat escape).
export const AUDIT_MAX_AGE_H = resolveCeiling(process.env.PRISM_AISYN_GATE_MAX_AGE_H, 24);
// LEG-B freshness ceiling (hours) on the combined-LoRA artifact MTIME (the jsonl
// carries no embedded timestamp). The producer chain runs nightly in the Ollama
// night lane (vault-to-lora x2 -> assemble-fleet-lora-corpus), so 48h = one
// missed night of margin. Defaults chosen under the operator's 2026-06-12
// "do everything now" blanket (U-LEGBC-FRESHNESS had been parked awaiting named
// thresholds); live age at adoption 16.1h. Tune via the knob.
export const LORA_MAX_AGE_H = resolveCeiling(process.env.PRISM_AISYN_LORA_MAX_AGE_H, 48);
// LEG-C freshness ceiling (DAYS) on NN-EVAL.json `assessedAt`. Evals change only
// on retrain/re-assessment; 21d forces a periodic re-eval cadence without
// constant red (live age at adoption: 6.5d). Same operator-blanket provenance.
export const NNEVAL_MAX_AGE_D = resolveCeiling(process.env.PRISM_AISYN_NNEVAL_MAX_AGE_D, 21);

// ── pure leg evaluators (injected data -> verdict). Each returns {pass, detail}. ──

// LEG-A: 0 gaps AND every galaxy score>=1. Freshness is OPT-IN (requireFreshness)
// so the pure evaluator stays hermetic for injected fixtures; the disk path
// (runGateFromDisk) always requires it -- a stale audit must not green the goal.
export function evalLegA(auditJson, { requireFreshness = false, nowMs = Date.now(), maxAgeH = AUDIT_MAX_AGE_H } = {}) {
  if (!auditJson || typeof auditJson !== "object") {
    return { pass: false, detail: "AI-SYNERGY-AUDIT.json missing/unparseable (R12: fail, not skip)" };
  }
  let freshEvidence = "";
  if (requireFreshness && maxAgeH > 0) {
    const gen = Date.parse(auditJson.generatedAt || "");
    if (!Number.isFinite(gen)) {
      return { pass: false, detail: "audit has no parseable generatedAt -- freshness unprovable (R12: fail); rerun scripts/audit-ai-synergy.mjs" };
    }
    const ageH = (nowMs - gen) / 3_600_000;
    if (ageH > maxAgeH) {
      return { pass: false, detail: `audit STALE: generated ${ageH.toFixed(1)}h ago (max ${maxAgeH}h, knob PRISM_AISYN_GATE_MAX_AGE_H) -- rerun scripts/audit-ai-synergy.mjs` };
    }
    // Observable PASS-path evidence: a live run PROVES freshness was enforced
    // (scrutiny P1 -- silent removal of the disk-path wiring must be visible).
    freshEvidence = `, fresh=${ageH.toFixed(1)}h<=${maxAgeH}h`;
  }
  const gs = auditJson.galaxies || auditJson.scores || {};
  const arr = Array.isArray(gs) ? gs : Object.values(gs);
  const total = arr.length;
  const ones = arr.filter((g) => Number(g && typeof g === "object" ? g.score : g) >= 1).length;
  const gaps = Array.isArray(auditJson.gaps) ? auditJson.gaps.length
    : auditJson.gaps && typeof auditJson.gaps === "object" ? Object.keys(auditJson.gaps).length : 0;
  const pass = total > 0 && ones === total && gaps === 0;
  return { pass, detail: `${ones}/${total} score>=1, gaps=${gaps}${freshEvidence}` };
}

// LEG-B: LoRA dataset trainingReady (>=floor rows) AND all expected galaxies tagged.
// Freshness OPT-IN (mirrors LEG-A): the jsonl has no timestamp, so the DISK path
// supplies the file mtime; hermetic fixtures stay pure with the default opts.
export function evalLegB(loraText, expectedGalaxies = EXPECTED_GALAXIES,
  { requireFreshness = false, nowMs = Date.now(), mtimeMs = null, maxAgeH = LORA_MAX_AGE_H } = {}) {
  if (typeof loraText !== "string" || loraText.trim() === "") {
    return { pass: false, detail: "fleet-lora-combined.jsonl missing/empty (R12: fail)" };
  }
  let freshEvidence = "";
  if (requireFreshness && maxAgeH > 0) {
    if (!Number.isFinite(mtimeMs)) {
      return { pass: false, detail: "lora artifact mtime unavailable -- freshness unprovable (R12: fail)" };
    }
    const ageH = (nowMs - mtimeMs) / 3_600_000;
    if (ageH > maxAgeH) {
      return { pass: false, detail: `lora artifact STALE: mtime ${ageH.toFixed(1)}h ago (max ${maxAgeH}h, knob PRISM_AISYN_LORA_MAX_AGE_H) -- rerun the producers (vault-to-lora-dataset + assemble-fleet-lora-corpus; both in the night lane)` };
    }
    freshEvidence = `, fresh=${ageH.toFixed(1)}h<=${maxAgeH}h`;
  }
  const lines = loraText.split("\n").filter((l) => l.trim() !== "");
  const galaxies = new Set();
  for (const l of lines) {
    try { const o = JSON.parse(l); if (o && o.galaxy) galaxies.add(o.galaxy); } catch { /* skip a torn line */ }
  }
  const rows = lines.length;
  const pass = rows >= LORA_READY_FLOOR && galaxies.size >= expectedGalaxies;
  return { pass, detail: `rows=${rows} (floor ${LORA_READY_FLOOR}), galaxies=${galaxies.size}/${expectedGalaxies}${freshEvidence}` };
}

// LEG-C: GNN AUROC>=floor AND a deployable selective tau exists. Also surfaces the
// bounded full-coverage residual (informational, not a gate input).
export function evalLegC(nnEvalJson, { requireFreshness = false, nowMs = Date.now(), maxAgeD = NNEVAL_MAX_AGE_D } = {}) {
  if (!nnEvalJson || typeof nnEvalJson !== "object") {
    return { pass: false, detail: "NN-EVAL.json missing/unparseable (R12: fail)", residual: null };
  }
  let freshEvidence = "";
  if (requireFreshness && maxAgeD > 0) {
    const at = Date.parse(nnEvalJson.assessedAt || "");
    if (!Number.isFinite(at)) {
      return { pass: false, detail: "NN-EVAL has no parseable assessedAt -- freshness unprovable (R12: fail); rerun the GNN assessment", residual: null };
    }
    const ageD = (nowMs - at) / 86_400_000;
    if (ageD > maxAgeD) {
      return { pass: false, detail: `NN-EVAL STALE: assessed ${ageD.toFixed(1)}d ago (max ${maxAgeD}d, knob PRISM_AISYN_NNEVAL_MAX_AGE_D) -- rerun the GNN assessment (india-owned)`, residual: null };
    }
    freshEvidence = `, fresh=${ageD.toFixed(1)}d<=${maxAgeD}d`;
  }
  const auroc = nnEvalJson.metrics && Number.isFinite(Number(nnEvalJson.metrics.auroc))
    ? Number(nnEvalJson.metrics.auroc) : null;
  const curve = (nnEvalJson.selective && Array.isArray(nnEvalJson.selective.curve)) ? nnEvalJson.selective.curve : [];
  const deployable = curve.filter((r) => r && r.brierClears === true && r.macroF1Clears === true);
  const best = deployable.slice().sort((a, b) => (b.coverage || 0) - (a.coverage || 0))[0] || null;
  const pass = auroc !== null && auroc >= GNN_AUROC_FLOOR && deployable.length > 0;
  const fullCoveragePass = !!(nnEvalJson.grade && nnEvalJson.grade.pass === true);
  return {
    pass,
    detail: auroc === null
      ? "no metrics.auroc"
      : `auroc=${auroc} (floor ${GNN_AUROC_FLOOR}); selective rows clearing both gates=${deployable.length}` +
        (best ? ` (best tau=${best.tau} cov=${(best.coverage * 100).toFixed(1)}% brier=${best.brier} macroF1=${best.macroF1})` : "") +
        freshEvidence,
    residual: {
      fullCoveragePass,
      note: fullCoveragePass
        ? "GNN full-coverage gate also passes."
        : "GNN FULL-coverage gate not yet met (ref-pool growth, india-owned data/GPU) -- bounded OUT of code scope; selective production bar is the gate.",
    },
  };
}

// LEG-D: CAG cold-anchor coverage >= floor (the keeper-named "CAG coverage >= 95%").
// Consumes the cag-cold-anchor-coverage aggregator's report. FAILS LOUD when there are
// no sessions (no data = fail, not silent pass -- R12). This makes the "cag" synergy
// clause measurable + terminating (U-CAG-COVERAGE-METRIC wired into the gate).
export function evalLegD(coverageReport, floor = CAG_COVERAGE_FLOOR) {
  if (!coverageReport || typeof coverageReport !== "object" ||
      !Number.isFinite(Number(coverageReport.sessions)) || coverageReport.sessions <= 0) {
    return { pass: false, detail: "CAG cold-anchor coverage report missing/empty (no sessions) -- R12: fail, not skip" };
  }
  const rate = Number(coverageReport.overallPresenceRate);
  const pass = Number.isFinite(rate) && rate >= floor;
  const worst = Array.isArray(coverageReport.sources) && coverageReport.sources.length ? coverageReport.sources[0] : null;
  return {
    pass,
    detail: `coverage=${(rate * 100).toFixed(1)}% (floor ${(floor * 100).toFixed(0)}%) over ${coverageReport.sessions} sessions, ${coverageReport.sourceCount} sources` +
      (worst ? `; worst=${worst.id} ${(worst.presenceRate * 100).toFixed(0)}%` : ""),
  };
}

// Compose the legs into the goal verdict. Injected payloads keep it hermetic.
export function evalGoalGate({ auditJson, loraText, nnEvalJson, cagCoverage, legAOpts, legBOpts, legCOpts } = {}) {
  const legA = evalLegA(auditJson, legAOpts);
  const legB = evalLegB(loraText, EXPECTED_GALAXIES, legBOpts);
  const legC = evalLegC(nnEvalJson, legCOpts);
  const legD = evalLegD(cagCoverage);
  const pass = legA.pass && legB.pass && legC.pass && legD.pass;
  return {
    pass,
    legs: {
      "A synergy-structure (34/34, gaps=0)": legA,
      "B LoRA data-complete (trainingReady, all galaxies)": legB,
      "C GNN deploy-ready-selective (AUROC>=0.78 + deployable tau)": legC,
      "D CAG cold-anchor coverage (>=95% over sessions)": legD,
    },
    residual: legC.residual,
  };
}

// ── I/O shell (only the main path touches the filesystem) ────────────────────
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function readText(p) { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } }

export function runGateFromDisk() {
  let cagCoverage = null;
  try { cagCoverage = buildCagCoverage({ window: 500 }); } catch { cagCoverage = null; }
  let loraMtimeMs = null;
  try { loraMtimeMs = fs.statSync(ARTIFACTS.lora).mtimeMs; } catch { loraMtimeMs = null; }
  return evalGoalGate({
    auditJson: readJson(ARTIFACTS.audit),
    loraText: readText(ARTIFACTS.lora),
    nnEvalJson: readJson(ARTIFACTS.nnEval),
    cagCoverage,
    // Disk path ALWAYS requires freshness on every time-decaying leg -- the live
    // gate must judge today's synergy, not week-old artifacts (stale data != pass,
    // R12). U-LEGA-FRESHNESS (audit) + U-LEGBC-FRESHNESS (lora mtime, NN-EVAL
    // assessedAt) -- the latter unblocked by the operator's 2026-06-12 directive.
    legAOpts: { requireFreshness: true },
    legBOpts: { requireFreshness: true, mtimeMs: loraMtimeMs },
    legCOpts: { requireFreshness: true },
  });
}

function main() {
  const r = runGateFromDisk();
  const json = process.argv.includes("--json");
  if (json) { process.stdout.write(JSON.stringify(r, null, 2) + "\n"); }
  else {
    process.stdout.write("AI-SYSTEMS-SYNERGY GOAL GATE (deterministic loss function)\n");
    for (const [name, leg] of Object.entries(r.legs)) {
      process.stdout.write(`  [${leg.pass ? "PASS" : "FAIL"}] ${name}\n         ${leg.detail}\n`);
    }
    process.stdout.write(`\n  L = A AND B AND C AND D: ${r.pass ? "PASS -- goal MET in code/structure/data" : "FAIL"}\n`);
    if (r.residual) process.stdout.write(`  residual: ${r.residual.note}\n`);
  }
  process.exit(r.pass ? 0 : 1);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
