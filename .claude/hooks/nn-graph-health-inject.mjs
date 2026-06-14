#!/usr/bin/env node
/**
 * .claude/hooks/nn-graph-health-inject.mjs
 *
 * SessionStart hook — surfaces the NN-GRAPH (GraphSAGE GNN tier-5) wiring-
 * inference health from `state/shared/nn-graph/NN-EVAL.json` (producer: the
 * nn-graph-eval pipeline, NN-GRAPH-MS0/MS1/MS2).
 *
 * Iter 18 of the /goal synergize loop (echo, 2026-05-21). Closes the
 * "neural network / gnn" substrate of the /goal: the GraphSAGE GNN is the
 * 5th tier of the wiring-inference cascade, but it is currently DORMANT
 * (model-side AUROC gate unmet — 0.096 vs the 0.78 promotion threshold) and
 * that dormancy is SILENT. No chat sees it. This hook makes the GNN tier's
 * health visible at every session start so the operator knows whether
 * tier-5 is contributing or deferring to tiers 1-4.
 *
 * This is a CONSUMER-only ship — the producer (nn-graph-eval) already
 * exists. It is read-only on NN-EVAL.json; it does NOT touch any NN/GNN
 * engine or the NN/GNN↔AI consumer code (a separate lane). Pattern mirrors
 * the iter-5/8/11/14 SessionStart consumers exactly.
 *
 * Discipline (mirrors knowledge-link-audit-inject / wiki-tribal-coverage):
 *   - ADVISORY only, NEVER blocking — exits 0; valid SessionStart envelope
 *   - No spawn — the eval pipeline runs on its own schedule
 *   - State-gated: silent ONLY when the GNN is healthy+deployed (AUROC past
 *     the promotion gate AND not deferred) — the interesting state (dormant /
 *     below-gate) always surfaces, because that's the operator-relevant news
 *   - Stale-gated: silent if NN-EVAL.json > STALE_MAX_HRS (default 720 = 30d)
 *   - Fail-soft on every error class — no inject is better than crash
 *
 * Promotion-gate thresholds are NN-GRAPH-MS2 doctrine (CLAUDE.md §NN-GRAPH):
 * AUROC ≥ 0.78, Brier ≤ 0.15. They are display constants for this digest
 * (NOT physics constants — the "never inline physics" rule is Kienzle/Taylor
 * /material; a hook cannot import from mcp-server/src/physics anyway). Named
 * + sourced below so a future gate change is a single-point edit.
 *
 * Knobs:
 *   PRISM_NN_GRAPH_INJECT=0       — disable entirely
 *   PRISM_NN_GRAPH_STALE_HRS=N    — staleness ceiling in hours (default 720)
 *   PRISM_NN_GRAPH_SHOW_OK=1      — also emit a line when GNN is healthy
 *                                   (default: silent when healthy+deployed)
 *
 * Stdin: standard SessionStart JSON envelope (ignored)
 * Stdout: hookSpecificOutput.additionalContext payload (or {})
 * Exit:   always 0
 */

// tier: T2
// SessionStart hook — NN-GRAPH (GraphSAGE tier-5) wiring-inference health
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// 2026-05-26 (U-D18-NN-GNN-COUNTER-WIRE, slot:alpha): S6 shared counter for
// FEATURE-UTILIZATION dashboard. NN_GNN was 0-fire pre-wire (low-tier).
import { incrementFeature } from "../helpers/feature-counter.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/PRISM";
const EVAL_PATH = path.join(PRISM_ROOT, "state/shared/nn-graph/NN-EVAL.json");
const DEFAULT_STALE_HRS = 720;
const MAX_EVAL_BYTES = 1 * 1024 * 1024; // 1MB — NN-EVAL.json is <1KB normally

// NN-GRAPH-MS2 promotion-gate thresholds (CLAUDE.md §NN-GRAPH). The GNN
// tier-5 is auto-promoted IFF auroc >= this AND brier <= this (macroF1 also
// gated but NN-EVAL.json does not always carry it — auroc is the binding
// constraint at 0.096 today).
// Exported so downstream consumers (psn-leg-state-inject's NN/GNN leg) gate
// against the SAME threshold — never re-inline 0.78/0.15 (drift risk).
export const PROMOTE_AUROC_MIN = 0.78;
export const PROMOTE_BRIER_MAX = 0.15;

function emit(additionalContext) {
  const payload = additionalContext
    ? { hookSpecificOutput: { hookEventName: "SessionStart", additionalContext } }
    : {};
  process.stdout.write(JSON.stringify(payload) + "\n");
  process.exit(0);
}

/**
 * Pure: load + validate NN-EVAL.json. Returns { evalReport, ageMs } or null.
 * Hostile-payload guards: size cap + JSON parse + shape check (must be a
 * non-null object; checkpointMeta optional — a deferred eval may omit it).
 */
export function loadEval(evalPath, nowMs = Date.now()) {
  try {
    if (!existsSync(evalPath)) return null;
    const st = statSync(evalPath);
    if (!Number.isFinite(st.size) || st.size > MAX_EVAL_BYTES || st.size <= 0) return null;
    const j = JSON.parse(readFileSync(evalPath, "utf8"));
    if (!j || typeof j !== "object") return null;
    const ageMs = Math.max(0, nowMs - st.mtimeMs);
    return { evalReport: j, ageMs };
  } catch {
    return null;
  }
}

/**
 * Pure: classify the GNN tier state from a parsed eval report.
 * Returns { dormant, healthy, auroc, brier, poolSize, graded, verdict, reason }.
 *
 * dormant  — `deferred:true` OR no usable checkpoint → tier-5 is not voting.
 * healthy  — NOT dormant AND auroc past gate AND brier within gate.
 * graded   — a real deploy-gate holdout was scored (the `metrics` path).
 *
 * nn-graph-eval's runAssessment emits TWO shapes; classifyGnn is the single
 * source of truth for both (U-NN-LEG-SCHEMA-READ-FIX consumers delegate here):
 *   • GRADED  (`deferred:false`): the holdout was scored — `metrics.auroc` /
 *     `metrics.brier` are the REAL deploy-gate numbers. A graded report has a
 *     loaded checkpoint by construction (you cannot score a holdout without one),
 *     so it is NEVER dormant — only below-gate or healthy.
 *   • DEFERRED (`deferred:true`): the holdout could not be built (e.g. empty
 *     reference pool). `checkpointMeta.auroc` is the link-prediction PRETEXT
 *     diagnostic — NOT the deploy gate — the only signal available, surfaced as
 *     a weak sub-gate indicator.
 * Read priority is metrics-first (R7: surface the more-authoritative signal, do
 * not blend it with the pretext). A flat legacy `{checkpointMeta.auroc}` doc
 * still resolves via the meta fallback.
 */
export function classifyGnn(evalReport) {
  const r = evalReport && typeof evalReport === "object" ? evalReport : {};
  const meta = r.checkpointMeta && typeof r.checkpointMeta === "object" ? r.checkpointMeta : {};
  const metrics = r.metrics && typeof r.metrics === "object" ? r.metrics : {};
  const deferred = r.deferred === true;
  // `poolSize` is DEFERRED-shape telemetry only — the GRADED shape carries
  // `holdoutN` instead and no `poolSize`, so this is 0 for a graded report.
  // Safe today (formatDigest renders poolSize only in the dormant branch, which
  // a graded report never enters); kept explicit so no future consumer reads
  // `classifyGnn(graded).poolSize` and reports a false "pool 0".
  const poolSizeRaw = Number(r.poolSize);
  const poolSize = Number.isFinite(poolSizeRaw) ? poolSizeRaw : 0;

  // AUROC: GRADED holdout metric (deploy gate) preferred over the DEFERRED
  // pretext-task diagnostic. `Number(undefined) === NaN` → null, so a missing
  // field never masquerades as 0 (the schema-read footgun this fix exists for).
  const metricAurocRaw = Number(metrics.auroc);
  const metricAuroc = Number.isFinite(metricAurocRaw) ? metricAurocRaw : null;
  const metaAurocRaw = Number(meta.auroc);
  const metaAuroc = Number.isFinite(metaAurocRaw) ? metaAurocRaw : null;
  // A report is "graded" when a real holdout metric exists AND it is not deferred.
  const graded = !deferred && metricAuroc !== null;
  const auroc = metricAuroc !== null ? metricAuroc : metaAuroc;

  // Brier: GRADED holdout `metrics.brier` preferred; else calibrated meta Brier
  // (the deployed signal), else raw meta Brier.
  const metricBrierRaw = Number(metrics.brier);
  const metricBrier = Number.isFinite(metricBrierRaw) ? metricBrierRaw : null;
  const brierCal = Number(meta.brierCalibrated);
  const brierRawMeta = Number(meta.brierRaw);
  const metaBrier = Number.isFinite(brierCal) ? brierCal
    : (Number.isFinite(brierRawMeta) ? brierRawMeta : null);
  const brier = metricBrier !== null ? metricBrier : metaBrier;

  // checkpointPresent: the explicit field, OR implied by a graded report — a
  // holdout cannot be scored without a loaded checkpoint to vote with.
  const checkpointPresent = r.checkpointPresent === true || graded;
  // dormant: explicitly deferred, or no checkpoint to vote with.
  const dormant = deferred || !checkpointPresent;
  // healthy: live AND past both gates. Unknown auroc/brier → not healthy
  // (cannot certify a tier we can't measure — fail-closed).
  const aurocPass = auroc !== null && auroc >= PROMOTE_AUROC_MIN;
  const brierPass = brier !== null && brier <= PROMOTE_BRIER_MAX;
  const healthy = !dormant && aurocPass && brierPass;
  // Degeneracy (U-NN-EVAL-DEGENERATE-GUARD): the eval marks a constant-vote
  // collapse where AUROC ~0.5 is a tie-break artifact, not a near-miss. Additive
  // read — absent on legacy reports (degenerate:false), present on graded ones.
  const degen = r.degeneracy && typeof r.degeneracy === "object" ? r.degeneracy : null;
  const degenerate = degen ? degen.isDegenerate === true : false;
  const degenerateMode = degen && typeof degen.mode === "string" ? degen.mode : "";
  // Selective deployment (U-GNN-SELECTIVE-DEPLOY): the tier-5 GNN abstains below
  // its confidence gate and defers to the LLM tier, so even when the FULL-coverage
  // grade fails it can be deploy-ready as an abstaining classifier at the production
  // gate. `selective.deployGrade.pass` is that verdict; absent on legacy reports.
  const sel = r.selective && typeof r.selective === "object" ? r.selective : null;
  const dg = sel && sel.deployGrade && typeof sel.deployGrade === "object" ? sel.deployGrade : null;
  const selectiveDeployReady = dg ? dg.pass === true : false;
  const op = selectiveDeployReady && dg.operatingPoint && typeof dg.operatingPoint === "object" ? dg.operatingPoint : null;
  const selectiveOperatingPoint = op
    ? { tau: op.tau, coverage: op.coverage, brier: op.brier, macroF1: op.macroF1,
        classesEmitted: Number.isFinite(op.classesEmitted) ? op.classesEmitted : null,
        totalClasses: Number.isFinite(op.totalClasses) ? op.totalClasses : null,
        concentrated: dg.concentrated === true }
    : null;
  return {
    dormant,
    healthy,
    auroc,
    brier,
    poolSize,
    graded,
    degenerate,
    degenerateMode,
    selectiveDeployReady,
    selectiveOperatingPoint,
    verdict: r.grade && typeof r.grade === "object" && typeof r.grade.verdict === "string"
      ? r.grade.verdict : "",
    reason: typeof r.reason === "string" ? r.reason : "",
    trainedAt: typeof meta.trainedAt === "string" ? meta.trainedAt : "",
  };
}

/**
 * Pure: render the digest. Returns null when (a) input unusable, (b) report
 * stale, (c) GNN healthy+deployed AND showOk is false (the silent path).
 */
export function formatDigest(evalReport, ageMs, opts = {}) {
  if (!evalReport || typeof evalReport !== "object") return null;
  const staleMs = (Number.isFinite(opts.staleHrs) ? opts.staleHrs : DEFAULT_STALE_HRS) * 3600_000;
  if (Number.isFinite(ageMs) && ageMs > staleMs) return null;
  const showOk = opts.showOk === true;
  const g = classifyGnn(evalReport);
  if (g.healthy && !showOk) return null; // silent when tier-5 is contributing

  const ageHrs = Number.isFinite(ageMs) ? Math.floor(ageMs / 3600_000) : 0;
  const ageLabel = ageHrs < 1 ? "fresh" : (ageHrs < 48 ? `${ageHrs}h old` : `${Math.floor(ageHrs / 24)}d old`);
  const aurocStr = g.auroc !== null ? g.auroc.toFixed(3) : "n/a";
  const brierStr = g.brier !== null ? g.brier.toFixed(3) : "n/a";

  if (g.healthy) {
    return `## 🧠 NN-GRAPH (GraphSAGE tier-5) health (${ageLabel})\n   ✓ GNN wiring-inference tier LIVE — AUROC ${aurocStr} (gate ≥${PROMOTE_AUROC_MIN}) · Brier ${brierStr} (gate ≤${PROMOTE_BRIER_MAX}).`;
  }

  const lines = [`## 🧠 NN-GRAPH (GraphSAGE tier-5) health (${ageLabel})`];
  if (g.dormant) {
    const why = g.reason ? ` — reason: ${g.reason}` : "";
    lines.push(`   ⚠ GNN wiring-inference tier **DORMANT**${why} (reference poolSize ${g.poolSize}). Tier-5 cascade defers to tiers 1-4.`);
  } else if (g.degenerate) {
    // A degenerate model scores ~0.5 by tie-break, NOT by being close — surface
    // it so the gate miss is never read as a tunable near-miss. Mode-agnostic:
    // both constant-vote and constant-confidence emit one confidence for every
    // input (the AUROC-voiding signature), so don't hardcode class-prior wording.
    const mode = g.degenerateMode || "constant-vote";
    lines.push(`   ⚠ GNN tier **DEGENERATE (${mode})** — the model emits one confidence for every input, so AUROC is a tie-break artifact, not a near-miss. Below gate by degeneracy, not margin — needs rearchitecting (features/vote/class balance), not threshold tuning.`);
  } else if (g.selectiveDeployReady && g.selectiveOperatingPoint) {
    const op = g.selectiveOperatingPoint;
    const covPct = Number.isFinite(op.coverage) ? `${(op.coverage * 100).toFixed(0)}%` : "?";
    const clsStr = Number.isFinite(op.classesEmitted) && Number.isFinite(op.totalClasses)
      ? ` Spans ${op.classesEmitted}/${op.totalClasses} classes${op.concentrated ? " (concentrated)" : ""}.`
      : "";
    lines.push(`   ◐ GNN tier **DEPLOY-READY-SELECTIVE** — below the full-coverage gate, but at the production confidence gate τ=${op.tau} it contributes on ${covPct} of ghosts (Brier ${op.brier}, macro-F1 ${op.macroF1}) and defers the rest to the LLM tier.${clsStr} Full-coverage pending reference-pool growth.`);
  } else {
    lines.push(`   ⚠ GNN tier live but **below promotion gate** — not yet contributing to wiring inference.`);
  }
  lines.push(`   AUROC **${aurocStr}** (promotion gate ≥${PROMOTE_AUROC_MIN}) · Brier **${brierStr}** (gate ≤${PROMOTE_BRIER_MAX}).`);
  lines.push(`   _Full: \`state/shared/nn-graph/NN-EVAL.json\`. Disable: \`PRISM_NN_GRAPH_INJECT=0\`._`);
  return lines.join("\n");
}

function main() {
  if (process.env.PRISM_NN_GRAPH_INJECT === "0") return emit(null);
  const loaded = loadEval(EVAL_PATH);
  if (!loaded) return emit(null);
  const sEnv = process.env.PRISM_NN_GRAPH_STALE_HRS;
  const staleEnv = sEnv !== undefined && sEnv !== "" ? Number(sEnv) : NaN;
  const opts = {
    staleHrs: Number.isFinite(staleEnv) ? staleEnv : DEFAULT_STALE_HRS,
    showOk: process.env.PRISM_NN_GRAPH_SHOW_OK === "1",
  };
  const digest = formatDigest(loaded.evalReport, loaded.ageMs, opts);
  if (!digest) return emit(null);
  // U-D18: feature engaged — NN/GNN eval report loaded + digest emitted.
  try { incrementFeature("NN_GNN", { slot: null }); } catch { /* never blocks */ }
  emit(digest);
}

function isInvokedDirectly() {
  if (typeof process.argv[1] !== "string") return false;
  try {
    const here = fileURLToPath(import.meta.url);
    const argv = path.resolve(process.argv[1]);
    return path.relative(here, argv) === "";
  } catch {
    return false;
  }
}

if (isInvokedDirectly()) {
  try { main(); } catch { emit(null); }
}
