#!/usr/bin/env node
/**
 * nn-graph-retrain-lifecycle.mjs — NN-GRAPH-MS2 / U2-SELF-RETRAIN-LIFECYCLE
 *
 * The autonomous half of the GNN tier-5 wiring classifier. Runs as a Windows
 * scheduled task (see .claude/helpers/install-nn-graph-retrain-task.ps1),
 * independent of any Claude session, on a periodic poll:
 *
 *   1. FINGERPRINT  — read system-graph.json, summarize {nodeCount, edgeCount,
 *                     ghostCount}.
 *   2. DRIFT-DETECT — compare the fingerprint against the lifecycle's own
 *                     baseline (state/shared/nn-graph/retrain-baseline.json).
 *                     No meaningful drift + a fresh baseline => SKIP (cheap
 *                     no-op). The reference pool is seeded into the graph by
 *                     NN-GRAPH-MS2 U1's regen-viz stage, so drift tracks the
 *                     real input the trainer would see.
 *   3. RETRAIN      — spawn graphsage-train-pipeline.mjs with --out pointed at
 *                     a CANDIDATE checkpoint. The live checkpoint is NEVER
 *                     touched by training.
 *   4. EVALUATE     — runAssessment() grades the candidate against the
 *                     NN-GRAPH-MS0 mandatory gates (AUROC>=0.78, macroF1>=0.55,
 *                     Brier<=0.15).
 *   5. PROMOTE      — atomically swap candidate -> live ONLY when every gate
 *                     clears. A deferred (un-graded) or sub-gate candidate is
 *                     NEVER promoted. The prior live checkpoint is preserved as
 *                     graphsage-checkpoint.prev.json (reversibility).
 *   6. LEDGER       — append one advisory JSONL record of the run.
 *
 * SAFETY INVARIANT (load-bearing): promoteDecision() returns promote:true if
 * and only if the assessment is graded (deferred===false) AND grade.pass===true.
 * Any other state — deferred, missing grade, pass not strictly true — yields
 * promote:false. A bad candidate cannot replace a good live checkpoint.
 *
 * Design: pure exported decision functions (graphFingerprint, driftDecision,
 * promoteDecision — unit-tested with reference values) + a fail-soft imperative
 * shell (runLifecycle) whose every side effect is an injectable dependency.
 * runLifecycle NEVER throws — operational failures surface in result.errors and
 * a non-zero exit code (R12 fail-loud). Mirrors the scripts/lib/*.mjs +
 * node:test convention of the rest of NN-GRAPH-MS0/MS1/MS2.
 *
 * Usage:
 *   node scripts/nn-graph-retrain-lifecycle.mjs            poll: drift -> maybe retrain
 *   node scripts/nn-graph-retrain-lifecycle.mjs --force    retrain regardless of drift
 *   node scripts/nn-graph-retrain-lifecycle.mjs --dry-run  train+eval+decide, never promote
 *   node scripts/nn-graph-retrain-lifecycle.mjs --status   print last run + checkpoint state
 *
 * Knobs (env):
 *   PRISM_NN_RETRAIN_DISABLE=1               refuse to do anything (kill switch)
 *   PRISM_NN_RETRAIN_DRY_RUN=1               force dry-run mode
 *   PRISM_NN_SELECTIVE_PROMOTE=1             opt-in: promote a robustly deploy-ready-SELECTIVE
 *                                            candidate when the full-coverage gate cannot clear
 *                                            (default OFF -- production is never auto-flipped)
 *   PRISM_NN_RETRAIN_MIN_NODE_DELTA_PCT=N    node-count drift band (default 10)
 *   PRISM_NN_RETRAIN_MIN_EDGE_DELTA_PCT=N    edge-count drift band (default 10)
 *   PRISM_NN_RETRAIN_MIN_GHOST_DELTA_PCT=N   ghost-pool drift band (default 25)
 *   PRISM_NN_RETRAIN_MAX_AGE_HOURS=N         retrain-anyway floor (default 168)
 *   PRISM_NN_RETRAIN_LIFECYCLE_HEAP_MB=N     heap bump for the lifecycle's own
 *                                            process (in-process eval/embed graph
 *                                            loads; default LIFECYCLE_DEFAULTS.heapMb)
 *   PRISM_NN_RETRAIN_NO_REEXEC=1             skip the self heap-bump re-exec
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { runAssessment } from "./lib/nn-graph-eval.mjs";
import { buildEmbeddingSource as buildNodeEmbeddingSource } from "./lib/graph-node-embedding-bridge.mjs";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, ".."); // scripts/ -> repo root
const NN_DIR = path.join(ROOT, "state", "shared", "nn-graph");
const GRAPH_PATH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const TRIBAL_INDEX_PATH = path.join(ROOT, "state", "shared", "tribal-embed-index.json");
const NODE_EMBED_PATH = path.join(NN_DIR, "node-embeddings-768d.jsonl");
const LIVE_CKPT = path.join(NN_DIR, "graphsage-checkpoint.json");
const CANDIDATE_CKPT = path.join(NN_DIR, "graphsage-checkpoint.candidate.json");
const PREV_CKPT = path.join(NN_DIR, "graphsage-checkpoint.prev.json");
const BASELINE_PATH = path.join(NN_DIR, "retrain-baseline.json");
const LEDGER_PATH = path.join(NN_DIR, "retrain-lifecycle.jsonl");
const TRAINER = path.join(ROOT, "scripts", "lib", "graphsage-train-pipeline.mjs");
const LOCK_PATH = path.join(NN_DIR, "retrain.lock");

const GHOST_KIND = "ghost.unwired-engine";
const LEDGER_MAX_BYTES = 512 * 1024; // one-deep rotation, matches fleet-memory-monitor
const SCHEMA_VERSION = 1;

/** Lifecycle tuning. Drift bands are percentage thresholds; age is a floor. */
export const LIFECYCLE_DEFAULTS = Object.freeze({
  minNodeDeltaPct: 10,   // total-node drift that justifies a retrain
  minEdgeDeltaPct: 10,   // total-edge drift that justifies a retrain
  minGhostDeltaPct: 25,  // ghost (reference-pool) drift — smaller pool, wider band
  maxAgeHours: 168,      // retrain weekly even with no graph drift (absorbs
                         // trainer-code changes the graph fingerprint cannot see)
  nodeTypeField: "layer", // stratified-negative-sampling field (NN-GRAPH-MS1)
  negPHard: 0.7,          // intra-type negative fraction (NN-GRAPH-MS1)
  heapMb: 8192,           // --max-old-space-size for the trainer subprocess
  // H2GCN ego/neighbour feature enrichment (BLACKWELL-AI-MS0/U-GNN-HOP-SWEEP). 0 = OFF
  // (default): the scheduled safety-net retrain must NOT 4x its feature dim + RAM unprompted.
  // hops=3 is the multi-seed-validated optimum (+0.138 AUROC lift) but ceilings ~0.64 < the
  // 0.78 gate, so default-on is not worth the OOM risk. Enable a deliberate gate-improvement
  // retrain via PRISM_NN_RETRAIN_HETEROPHILY_HOPS=3 (the trainer heap auto-bumps -- see
  // buildTrainArgs). Memory: [[reference_h2gcn_hop_sweep_2026_06_09]].
  heterophilyHops: 0,
});

/* ------------------------------------------------------------------ *
 * Pure decision functions — exported, reference-tested, no I/O.
 * ------------------------------------------------------------------ */

/**
 * Absolute percentage delta of `cur` against `base`. A non-finite input, or a
 * zero baseline with a non-zero current, returns Infinity — "cannot prove the
 * value held steady", which the drift gate treats as a retrain trigger. A zero
 * baseline AND zero current is a genuine 0% delta.
 */
function pctDelta(cur, base) {
  if (!Number.isFinite(cur) || !Number.isFinite(base)) return Infinity;
  if (base === 0) return cur === 0 ? 0 : Infinity;
  return (Math.abs(cur - base) / base) * 100;
}

/** Render a percentage for a human-readable reason string (ASCII-safe). */
function fmtPct(x) {
  if (!Number.isFinite(x)) return ">999%";
  return x.toFixed(1) + "%";
}

/**
 * Summarize a system-viz graph object into the drift fingerprint. Defensive:
 * a null / malformed graph, or non-array nodes/edges, yields all-zero counts
 * rather than throwing — the caller's drift gate then treats the run as
 * "fingerprint unreadable" and retrains defensively.
 */
export function graphFingerprint(graph) {
  const nodes = graph && Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = graph && Array.isArray(graph.edges) ? graph.edges : [];
  let ghostCount = 0;
  for (const n of nodes) {
    if (n && typeof n === "object" && n.kind === GHOST_KIND) ghostCount++;
  }
  return { nodeCount: nodes.length, edgeCount: edges.length, ghostCount };
}

/**
 * Decide whether the current graph has drifted enough from the lifecycle's
 * baseline to justify a retrain. Returns { retrain:boolean, reason:string }.
 *
 * Triggers, in order: forced -> no baseline (first run) -> unreadable
 * fingerprint -> node/edge/ghost drift past its band -> baseline older than the
 * age floor. None firing -> skip. The baseline records the fingerprint of the
 * graph the last candidate was trained on; the trainer is deterministic, so an
 * unchanged graph would reproduce the same candidate and a retrain is wasted.
 */
export function driftDecision(opts = {}) {
  const cfg = { ...LIFECYCLE_DEFAULTS, ...(opts.cfg || {}) };
  const cur = opts.current || {};
  const base = opts.baseline;

  if (opts.force === true) return { retrain: true, reason: "forced (--force)" };

  if (!base || typeof base !== "object" || !base.fingerprint || typeof base.fingerprint !== "object") {
    return { retrain: true, reason: "no baseline — first lifecycle run" };
  }
  if (!Number.isFinite(cur.nodeCount) || !Number.isFinite(cur.edgeCount) || !Number.isFinite(cur.ghostCount)) {
    return { retrain: true, reason: "current graph fingerprint unreadable — retraining defensively" };
  }

  const bf = base.fingerprint;
  const nodeD = pctDelta(cur.nodeCount, bf.nodeCount);
  const edgeD = pctDelta(cur.edgeCount, bf.edgeCount);
  const ghostD = pctDelta(cur.ghostCount, bf.ghostCount);
  const deltas = `nodes ${fmtPct(nodeD)}, edges ${fmtPct(edgeD)}, ghosts ${fmtPct(ghostD)}`;

  if (nodeD >= cfg.minNodeDeltaPct) {
    return { retrain: true, reason: `graph drift — ${deltas} (node band ${cfg.minNodeDeltaPct}%)` };
  }
  if (edgeD >= cfg.minEdgeDeltaPct) {
    return { retrain: true, reason: `graph drift — ${deltas} (edge band ${cfg.minEdgeDeltaPct}%)` };
  }
  if (ghostD >= cfg.minGhostDeltaPct) {
    return { retrain: true, reason: `reference-pool drift — ${deltas} (ghost band ${cfg.minGhostDeltaPct}%)` };
  }

  const recordedAt = base.recordedAt ? Date.parse(base.recordedAt) : NaN;
  const nowMs = opts.now ? new Date(opts.now).getTime() : Date.now();
  if (Number.isFinite(recordedAt) && Number.isFinite(nowMs)) {
    const ageH = (nowMs - recordedAt) / 3.6e6;
    if (ageH >= cfg.maxAgeHours) {
      return {
        retrain: true,
        reason: `baseline stale — age ${ageH.toFixed(1)}h >= ${cfg.maxAgeHours}h floor (absorb trainer-code changes)`,
      };
    }
    return { retrain: false, reason: `no significant drift — ${deltas}; baseline age ${ageH.toFixed(1)}h < ${cfg.maxAgeHours}h` };
  }
  // Baseline carries no parseable timestamp — the age floor cannot apply; skip
  // on the count deltas alone (they all cleared their bands above).
  return { retrain: false, reason: `no significant drift — ${deltas}` };
}

/**
 * Decide whether a freshly-evaluated candidate checkpoint may replace the live
 * checkpoint. Returns { promote:boolean, reason:string }.
 *
 * THE SAFETY INVARIANT. promote===true requires ALL of:
 *   - an assessment object exists
 *   - assessment.deferred === false  (it was graded, not skipped)
 *   - assessment.grade.pass === true (strict — every NN-GRAPH gate cleared)
 * Anything else — null, deferred (insufficient reference pool), a sub-gate
 * grade, or a non-boolean pass — yields promote:false. A model below the gate
 * is never promoted.
 */
export function promoteDecision(opts = {}) {
  const a = opts && opts.assessment;
  if (!a || typeof a !== "object") {
    return { promote: false, reason: "no assessment object — cannot certify, not promoted" };
  }
  if (a.deferred !== false) {
    const why = typeof a.reason === "string" && a.reason ? a.reason : "unknown";
    return { promote: false, reason: `candidate not graded (deferred: ${why}) — cannot certify, not promoted` };
  }
  const g = a.grade;
  if (!g || typeof g !== "object" || g.pass !== true) {
    const fails = g && Array.isArray(g.failures) && g.failures.length
      ? g.failures.join("; ")
      : "grade missing or pass not strictly true";
    // SELECTIVE-DEPLOY promotion path (AI-SYSTEMS, opt-in via PRISM_NN_SELECTIVE_PROMOTE).
    // The live tier-5 runs an ancient 8-dim AUROC-0.096 checkpoint because NO model clears the
    // FULL-COVERAGE gate (gradeMetrics) -- a research-gated ceiling (ref-pool + arch, not calibration).
    // But a model that is robustly deploy-ready-SELECTIVE -- AUROC certifies the global confidence
    // order AND the emitted set clears Brier+macroF1 at AND above the production gate tau (=GNN_DEFAULTS
    // .minConf, 0.7) -- is STRICTLY BETTER than the 0.096 model: the tier-5 consumer ALREADY abstains
    // below minConf and defers to the LLM tier (textbook risk@coverage), so above the gate it emits good
    // predictions and below it costs nothing. No consumer change needed; the abstention is consumer-side.
    // Gated behind opts.allowSelective so PRODUCTION IS NEVER AUTO-FLIPPED -- operator opt-in only. Also
    // requires robustAboveGate (clears at EVERY tau >= the gate, not a lone noise spike) for conservatism.
    const sel = a.selective;
    const dg = sel && sel.deployGrade;
    const dp = sel && sel.deployPoint;
    if (opts.allowSelective === true && dg && dg.pass === true && dp && dp.robustAboveGate === true) {
      return {
        promote: true,
        mode: "selective",
        reason: `selective-deploy promotion (opt-in): full-coverage gate not cleared (${fails}), but robustly deploy-ready-selective at tau=${dp.productionMinConf} -- consumer abstains below minConf -- verdict: ${dg.verdict || "deploy-ready-selective"}`,
      };
    }
    return { promote: false, reason: `gate not cleared (${fails}) -- NEVER promote a sub-gate checkpoint${opts.allowSelective ? " (selective path also not robust)" : ""}` };
  }
  return { promote: true, mode: "full", reason: `all NN-GRAPH gates cleared (verdict: ${g.verdict || "deploy-ready"})` };
}

/* ------------------------------------------------------------------ *
 * Default side-effecting implementations (overridable for tests).
 * ------------------------------------------------------------------ */

function defaultReadGraph() {
  // Streaming read — bypasses V8 ~512MB string-length ceiling. See scripts/lib/graph-io.mjs.
  return readGraphStreaming(GRAPH_PATH);
}

function defaultReadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
  } catch {
    // A corrupt baseline is treated as "no baseline" — driftDecision then
    // retrains (first-run path). Never let a bad sidecar block the lifecycle.
    return null;
  }
}

function defaultWriteBaseline(obj) {
  fs.mkdirSync(NN_DIR, { recursive: true });
  const tmp = BASELINE_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, BASELINE_PATH); // atomic on the same volume
}

/**
 * Build a fresh GNN node-embedding source JSONL via the graph-node embedding
 * bridge BEFORE each retrain. Pre-RAG-UPGRADE-MS0/U-GNN-NODE-EMBED-BRIDGE,
 * the trainer's embedding-source loader had nothing to load — the wiki tribal-
 * embed-index was keyed by `wiki:<rel-path>` but the loader is keyed by `n:
 * <node.id>`. This stage joins them at the lifecycle layer so every retrain
 * sees up-to-the-second graph + index state without an operator pre-step.
 *
 * Fail-soft: if the bridge build fails (missing index, corrupt graph), the
 * lifecycle still runs the trainer WITHOUT --embedding-source. The trainer
 * falls back to projected 8-d features — the legacy path before NN-1, still
 * functional. The build outcome is surfaced in the ledger.
 */
function defaultBuildEmbeddingSource() {
  return buildNodeEmbeddingSource({
    graphPath: GRAPH_PATH,
    indexPath: TRIBAL_INDEX_PATH,
    outPath: NODE_EMBED_PATH,
  });
}

/**
 * Build the trainer spawn args. Pure + exported so the heterophily/heap/embedding wiring is
 * testable WITHOUT spawning a real train. --graph pins the trainer to the EXACT graph the
 * lifecycle fingerprinted + will evaluate (fingerprint -> train -> eval see one input).
 * When cfg.heterophilyHops>0 the feature dim grows 768->768*(1+hops) (~4x at hops=3), so the
 * trainer heap is bumped to >=12288 MB (the validate harness needed ~12 GB for hops=3) and
 * --heterophily-hops is passed; hops=0 (default) yields byte-identical legacy args + heap.
 */
export function buildTrainArgs(cfg, { candidatePath, graphPath, embeddingSourcePath } = {}) {
  const heterophilyOn = Number.isInteger(cfg.heterophilyHops) && cfg.heterophilyHops > 0;
  const heapMb = heterophilyOn ? Math.max(cfg.heapMb, 12288) : cfg.heapMb;
  const args = [
    `--max-old-space-size=${heapMb}`,
    TRAINER,
    "--out", candidatePath,
    "--graph", graphPath,
    "--node-type-field", cfg.nodeTypeField,
    "--neg-p-hard", String(cfg.negPHard),
  ];
  if (heterophilyOn) {
    args.push("--heterophily-hops", String(cfg.heterophilyHops));
  }
  // --embedding-source is opt-in (only when the bridge build produced a usable
  // JSONL this run). Trainer falls back to projected 8-d features when the
  // flag is absent — same behavior as pre-NN-1 retrains.
  if (embeddingSourcePath) {
    args.push("--embedding-source", embeddingSourcePath);
  }
  return args;
}

/**
 * Pure: classify a trainer spawn outcome. A clean exit (status 0) that produced NO fresh
 * candidate checkpoint is a SILENT FAILURE, not a success -- verified 2026-06-11 (slot:charlie):
 * the H2GCN (heterophily) feature build NATIVE-OOMs at a large --max-nodes cap and the trainer
 * dies exit-0 with no stdout + no checkpoint (V8's heap-abort never fires on a native alloc
 * failure). Without this guard the lifecycle eval/promotes a STALE checkpoint or mislabels the
 * round "trained". Mirrors the sibling r.signal guard (SIGKILL OOM-reap).
 * @param {{status:number|null, signal:string|null, error:string|undefined, wroteCheckpoint:boolean}} o
 * @returns {{ok:boolean, code:number|null, error?:string}}
 */
export function classifyTrainResult({ status, signal, error, wroteCheckpoint }) {
  if (error) return { ok: false, code: null, error };
  if (signal) return { ok: false, code: null, error: `trainer killed by signal ${signal}` };
  if (status === 0 && !wroteCheckpoint) {
    return {
      ok: false,
      code: 0,
      error:
        "trainer exited 0 but wrote no fresh candidate checkpoint -- likely a silent native-OOM " +
        "(lower --max-nodes; H2GCN --heterophily-hops 4x's the feature dim and OOMs the default cap)",
    };
  }
  return { ok: status === 0, code: status };
}

function defaultTrain({ candidatePath, graphPath, cfg, embeddingSourcePath }) {
  const args = buildTrainArgs(cfg, { candidatePath, graphPath, embeddingSourcePath });
  const beforeMs = fs.existsSync(candidatePath) ? fs.statSync(candidatePath).mtimeMs : 0;
  const r = spawnSync(process.execPath, args, { stdio: "inherit", cwd: ROOT });
  const wroteCheckpoint = fs.existsSync(candidatePath) && fs.statSync(candidatePath).mtimeMs > beforeMs;
  return classifyTrainResult({ status: r.status, signal: r.signal, error: r.error && r.error.message, wroteCheckpoint });
}

function defaultEval({ checkpointPath }) {
  // runAssessment reads the system-viz graph itself — the lifecycle drops its
  // own graph reference before training, so the host is not holding ~1-2 GB of
  // parsed graph through the multi-minute train window (memory-pressure aware,
  // consistent with the FLEET-REAPER Tier-1 doctrine).
  return runAssessment({ checkpoint: checkpointPath });
}

function defaultPromote({ candidatePath, livePath, prevPath }) {
  if (!fs.existsSync(candidatePath)) {
    throw new Error(`candidate checkpoint missing: ${candidatePath}`);
  }
  // Reversibility (feedback_never_delete_only_disable): the prior live
  // checkpoint is preserved as .prev before the swap, never discarded.
  // Ordering is deliberate — copy live->prev FIRST, then rename candidate->live.
  // A crash in the window leaves `live` INTACT (the GNN tier-5 keeps working);
  // the inverse order (rename live->prev first) would leave `live` ABSENT on a
  // mid-swap crash. Preserving the live checkpoint is the priority. Concurrent
  // runs cannot interleave here — runLifecycle holds an exclusive lock.
  if (fs.existsSync(livePath)) {
    fs.copyFileSync(livePath, prevPath);
  }
  fs.renameSync(candidatePath, livePath); // atomic on the same volume
}

/**
 * Acquire the exclusive lifecycle lock. An overlapping run (the scheduled task
 * racing a manual --force, or two manual runs) sharing the candidate-checkpoint
 * path would corrupt it; this serializes them. A stale lock whose holder PID is
 * dead is reclaimed. Returns { ok:true } on success, or { ok:false, heldByPid }
 * when a LIVE peer holds it.
 */
function defaultAcquireLock() {
  fs.mkdirSync(NN_DIR, { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(LOCK_PATH, String(process.pid), { flag: "wx" });
      return { ok: true };
    } catch (e) {
      if (e.code !== "EEXIST") return { ok: false, error: e.message };
      let heldByPid = null;
      try {
        heldByPid = parseInt(String(fs.readFileSync(LOCK_PATH, "utf8")).trim(), 10);
      } catch {
        /* unreadable lock — treated as stale below */
      }
      if (Number.isInteger(heldByPid) && heldByPid > 0 && isPidAlive(heldByPid)) {
        return { ok: false, heldByPid };
      }
      // Stale lock (holder dead or file unreadable) — clear it and retry once.
      try {
        fs.unlinkSync(LOCK_PATH);
      } catch {
        /* a racing run cleared/took it first — the retry resolves the winner */
      }
    }
  }
  return { ok: false, error: "could not acquire lock after stale-clear" };
}

/** Liveness probe — signal 0 never delivers, only checks the PID exists. */
function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM"; // exists but owned by another user
  }
}

function defaultReleaseLock() {
  try {
    fs.unlinkSync(LOCK_PATH);
  } catch {
    /* already gone — release is idempotent */
  }
}

function defaultAppendLedger(record) {
  fs.mkdirSync(NN_DIR, { recursive: true });
  try {
    const st = fs.statSync(LEDGER_PATH);
    if (st.size > LEDGER_MAX_BYTES) fs.renameSync(LEDGER_PATH, LEDGER_PATH + ".1");
  } catch {
    /* no ledger yet — nothing to rotate */
  }
  fs.appendFileSync(LEDGER_PATH, JSON.stringify(record) + "\n");
}

/* ------------------------------------------------------------------ *
 * Imperative shell.
 * ------------------------------------------------------------------ */

/** Compact a runAssessment() result for the ledger (drops bulky samples). */
function summarizeAssessment(a) {
  if (!a || typeof a !== "object") return { deferred: true, reason: "no assessment" };
  if (a.deferred) {
    return { deferred: true, reason: a.reason || "unknown", poolSize: a.poolSize ?? null };
  }
  return {
    deferred: false,
    holdoutN: a.holdoutN ?? null,
    metrics: a.metrics || null,
    grade: a.grade
      ? { pass: a.grade.pass, verdict: a.grade.verdict, failures: a.grade.failures || [] }
      : null,
  };
}

/**
 * Active-learning loop closure (AI-SYSTEMS #4, slot:india). When a candidate is NOT
 * promoted, the model is label-starved (macroF1 below the gate -- the measured root
 * cause, NOT calibration). Refresh the operator label worklist
 * (`scripts/lib/gnn-active-pool-select.mjs`) so the next labeling round targets the
 * highest-acquisition ghosts (uncertainty x class-rarity), seeding `vault-to-gnn-refpool`.
 * Runs as an ISOLATED subprocess so a crash/timeout can never affect promotion or
 * lifecycle state -- FAIL-SOFT, advisory only (recorded on result.activeWorklist).
 */
function refreshActiveLabelWorklist({ spawnImpl = spawnSync } = {}) {
  try {
    const script = path.join(ROOT, "scripts", "lib", "gnn-active-pool-select.mjs");
    if (!fs.existsSync(script)) return { ok: false, reason: "selector-absent" };
    const r = spawnImpl(process.execPath, [script], { encoding: "utf8", timeout: 300000 });
    if (r && r.status === 0) return { ok: true };
    return { ok: false, reason: `exit ${r ? r.status : "?"}: ${((r && r.stderr) || "").slice(0, 200)}` };
  } catch (e) {
    return { ok: false, reason: e && e.message ? e.message : String(e) };
  }
}

function resolveCfg(env, optsCfg) {
  const numEnv = (key, fallback) => {
    const v = Number(env[key]);
    return Number.isFinite(v) && v >= 0 ? v : fallback;
  };
  return {
    ...LIFECYCLE_DEFAULTS,
    minNodeDeltaPct: numEnv("PRISM_NN_RETRAIN_MIN_NODE_DELTA_PCT", LIFECYCLE_DEFAULTS.minNodeDeltaPct),
    minEdgeDeltaPct: numEnv("PRISM_NN_RETRAIN_MIN_EDGE_DELTA_PCT", LIFECYCLE_DEFAULTS.minEdgeDeltaPct),
    minGhostDeltaPct: numEnv("PRISM_NN_RETRAIN_MIN_GHOST_DELTA_PCT", LIFECYCLE_DEFAULTS.minGhostDeltaPct),
    maxAgeHours: numEnv("PRISM_NN_RETRAIN_MAX_AGE_HOURS", LIFECYCLE_DEFAULTS.maxAgeHours),
    heterophilyHops: numEnv("PRISM_NN_RETRAIN_HETEROPHILY_HOPS", LIFECYCLE_DEFAULTS.heterophilyHops),
    ...(optsCfg || {}),
  };
}

/** Append a ledger record; a ledger failure is advisory, never fatal. */
function safeLedger(appendLedger, result, errors) {
  try {
    appendLedger({
      schemaVersion: SCHEMA_VERSION,
      ts: result.ts,
      action: result.action,
      ok: result.ok,
      drift: result.drift,
      fingerprint: result.fingerprint,
      trained: result.trained,
      trainExitCode: result.trainExitCode,
      assessment: result.assessment,
      promote: result.promote,
      promoted: result.promoted,
      errors: errors.slice(),
    });
  } catch (e) {
    errors.push(`ledger append failed: ${e && e.message ? e.message : e}`);
  }
}

/**
 * Run one lifecycle pass. Returns a plain result object — NEVER throws. Every
 * side effect is an injectable dependency so the orchestration is unit-testable
 * without spawning a 30-epoch train or parsing a 150 MB graph:
 *   opts.readGraph()                  -> graph object
 *   opts.readBaseline()               -> baseline object | null
 *   opts.writeBaseline(obj)
 *   opts.trainFn({candidatePath,graphPath,cfg}) -> { ok, code, error? }
 *   opts.evalFn({checkpointPath})     -> runAssessment-shaped result
 *   opts.promoteCheckpoint({candidatePath,livePath,prevPath})
 *   opts.appendLedger(record)
 *   opts.acquireLock() -> { ok:true } | { ok:false, heldByPid?, error? }
 *   opts.releaseLock()
 *   opts.force / opts.dryRun / opts.now / opts.env / opts.cfg
 *
 * result.action is one of: disabled · locked · error · skip · train-failed ·
 * eval-failed · not-promoted · dry-run-would-promote · promoted · promote-failed.
 */
export function runLifecycle(opts = {}) {
  const env = opts.env || process.env;
  const errors = [];
  const ts = (opts.now ? new Date(opts.now) : new Date()).toISOString();
  const result = {
    ok: true,
    action: null,
    ts,
    drift: null,
    fingerprint: null,
    trained: false,
    trainExitCode: null,
    assessment: null,
    promote: null,
    promoted: false,
    errors,
  };

  if (env.PRISM_NN_RETRAIN_DISABLE === "1") {
    result.action = "disabled";
    return result; // kill switch: do nothing, not even a ledger write
  }

  const dryRun = opts.dryRun === true || env.PRISM_NN_RETRAIN_DRY_RUN === "1";
  const force = opts.force === true;
  const cfg = resolveCfg(env, opts.cfg);

  const readGraph = opts.readGraph || defaultReadGraph;
  const readBaseline = opts.readBaseline || defaultReadBaseline;
  const writeBaseline = opts.writeBaseline || defaultWriteBaseline;
  const trainFn = opts.trainFn || defaultTrain;
  const evalFn = opts.evalFn || defaultEval;
  const promoteFn = opts.promoteCheckpoint || defaultPromote;
  const appendLedger = opts.appendLedger || defaultAppendLedger;
  const acquireLock = opts.acquireLock || defaultAcquireLock;
  const refreshWorklistImpl = opts.refreshWorklistImpl || refreshActiveLabelWorklist;
  const releaseLock = opts.releaseLock || defaultReleaseLock;

  // 0. Exclusive lock — serialize against an overlapping run (scheduled task
  // racing a manual --force) that would otherwise corrupt the shared candidate
  // checkpoint path. A held lock is NOT an operational failure: ok stays true,
  // the run exits 0, and no ledger row is written (overlap is not noteworthy).
  let lock;
  try {
    lock = acquireLock();
  } catch (e) {
    lock = { ok: false, error: e && e.message ? e.message : String(e) };
  }
  if (!lock || lock.ok !== true) {
    result.action = "locked";
    const detail = lock && lock.heldByPid
      ? ` (pid ${lock.heldByPid})`
      : lock && lock.error ? ` (${lock.error})` : "";
    errors.push(`another retrain lifecycle holds the lock${detail} — skipped this run`);
    return result;
  }

  try {
    // 1. Fingerprint the current graph.
    let graph;
    try {
      graph = readGraph();
    } catch (e) {
      errors.push(`graph read failed: ${e && e.message ? e.message : e}`);
      result.ok = false;
      result.action = "error";
      safeLedger(appendLedger, result, errors);
      return result;
    }
    const fingerprint = graphFingerprint(graph);
    result.fingerprint = fingerprint;
    graph = null; // release ~1-2 GB before the multi-minute train window

    // 2. Drift gate.
    let baseline = null;
    try {
      baseline = readBaseline();
    } catch (e) {
      errors.push(`baseline read failed: ${e && e.message ? e.message : e}`);
    }
    const drift = driftDecision({ current: fingerprint, baseline, cfg, now: ts, force });
    result.drift = drift;
    if (!drift.retrain) {
      result.action = "skip";
      safeLedger(appendLedger, result, errors);
      return result;
    }

    // 2b. Build a fresh node-embedding source via the graph-node bridge
    // (RAG-UPGRADE-MS0 / U-GNN-NODE-EMBED-BRIDGE). The output JSONL is passed
    // to the trainer as --embedding-source so the GraphSAGE input layer
    // receives 768-d wiki embeddings on every matched node instead of the
    // legacy 8-d projected hand-features. Fail-soft: a build failure does NOT
    // abort the lifecycle — the trainer falls back to projected features.
    const buildEmbed = opts.buildEmbeddingSource || defaultBuildEmbeddingSource;
    let embeddingSourcePath = null;
    let embeddingBuild = null;
    try {
      embeddingBuild = buildEmbed();
      if (embeddingBuild && embeddingBuild.ok && embeddingBuild.written === 1 && embeddingBuild.matched > 0) {
        embeddingSourcePath = embeddingBuild.outPath;
      } else if (embeddingBuild && embeddingBuild.errors && embeddingBuild.errors.length) {
        errors.push(`node-embedding bridge: ${embeddingBuild.errors[0]} (training continues without --embedding-source)`);
      } else if (embeddingBuild && embeddingBuild.matched === 0) {
        errors.push("node-embedding bridge: matched=0 — training continues without --embedding-source (projected fallback)");
      }
    } catch (e) {
      errors.push(`node-embedding bridge failed: ${e && e.message ? e.message : e} (training continues without --embedding-source)`);
    }

    // 2c. Galaxy node-features (AI-SYNERGY-AUDIT-MS0/U-AISYN-GNN-NODEFEAT, slot:charlie):
    // merge 768d doctrine embeddings for the 34 `ghost.galaxy.<g>` roosts INTO the freshly
    // built source, so the GNN gets a semantic feature for every galaxy node it must
    // classify (the source previously covered 0 galaxy roosts -- the ref-pool gap the NN/GNN
    // PSN leg flags). Fail-soft + opt-out (PRISM_GNN_GALAXY_NODEFEAT_DISABLE=1); a failure
    // here NEVER aborts the retrain (the base embedding source is already valid).
    if (embeddingSourcePath && process.env.PRISM_GNN_GALAXY_NODEFEAT_DISABLE !== "1") {
      try {
        // Heap bump (regression 2026-06-11): this child embeds 34 galaxies' doctrine and
        // reads/rewrites the multi-hundred-row source; under concurrent fleet RAM pressure it
        // OOM'd at the default heap (exit 134/SIGABRT). Same flag the trainer + lifecycle use.
        const galaxyHeapMb = Number(process.env.PRISM_NN_RETRAIN_LIFECYCLE_HEAP_MB) || LIFECYCLE_DEFAULTS.heapMb;
        const gm = spawnSync(process.execPath, nodeArgsWithHeap(path.join(__dirname, "build-galaxy-node-embeddings.mjs"), galaxyHeapMb), {
          cwd: ROOT,
          encoding: "utf8",
          timeout: 300000,
        });
        const summary = ((gm.stdout || "").trim().split("\n").pop() || "").slice(0, 200);
        result.galaxyNodeFeatures = { ran: true, status: gm.status, summary };
        // status 0 = clean, 2 = partial (some galaxies skipped but the rest merged); both leave
        // the source improved. Any other status is a real failure worth surfacing (not aborting).
        if (gm.status !== 0 && gm.status !== 2) {
          errors.push(`galaxy node-features: exit ${gm.status} (retrain continues) ${(gm.stderr || "").slice(0, 120)}`);
        }
      } catch (e) {
        errors.push(`galaxy node-features failed: ${e && e.message ? e.message : e} (retrain continues)`);
      }
    }

    result.embeddingBridge = embeddingBuild ? {
      ok: embeddingBuild.ok,
      matched: embeddingBuild.matched,
      unmatched: embeddingBuild.unmatched,
      dim: embeddingBuild.dim,
      used: embeddingSourcePath != null,
    } : { ok: false, used: false };

    // 3. Train a candidate checkpoint (live checkpoint untouched).
    let train;
    try {
      train = trainFn({ candidatePath: CANDIDATE_CKPT, graphPath: GRAPH_PATH, cfg, embeddingSourcePath });
    } catch (e) {
      train = { ok: false, code: null, error: e && e.message ? e.message : String(e) };
    }
    result.trainExitCode = train && Number.isFinite(train.code) ? train.code : null;
    if (!train || train.ok !== true) {
      errors.push(`training failed: ${train && train.error ? train.error : `exit ${result.trainExitCode}`}`);
      result.ok = false;
      result.action = "train-failed";
      safeLedger(appendLedger, result, errors);
      return result; // no candidate produced — baseline NOT advanced, retry next run
    }
    result.trained = true;

    // 4. Evaluate the candidate against the mandatory gates.
    let assessment;
    try {
      assessment = evalFn({ checkpointPath: CANDIDATE_CKPT });
    } catch (e) {
      errors.push(`evaluation failed: ${e && e.message ? e.message : e}`);
      result.ok = false;
      result.action = "eval-failed";
      // A candidate WAS trained; advance the baseline so the deterministic
      // trainer is not re-run over an identical graph next poll.
      if (!dryRun) recordBaseline(writeBaseline, fingerprint, ts, result, errors);
      safeLedger(appendLedger, result, errors);
      return result;
    }
    result.assessment = summarizeAssessment(assessment);

    // The candidate was trained successfully — advance the baseline (except in
    // dry-run, which must not mutate lifecycle state). This fires even when the
    // candidate FAILS the gate: the trainer is deterministic, so re-running it
    // over the same graph would reproduce the identical un-promotable candidate.
    // The next genuine retry is driven by graph drift or the maxAgeHours floor.
    if (!dryRun) recordBaseline(writeBaseline, fingerprint, ts, result, errors);

    // 5. Promote decision — the safety invariant.
    // allowSelective (PRISM_NN_SELECTIVE_PROMOTE=1, default OFF) opts in to promoting a robustly
    // deploy-ready-SELECTIVE candidate when the full-coverage gate cannot clear -- strictly better
    // than the live 8-dim 0.096 model since the consumer already abstains below minConf. Never
    // auto-flips: production behavior is byte-identical unless the operator sets the flag.
    const allowSelective = process.env.PRISM_NN_SELECTIVE_PROMOTE === "1";
    const promote = promoteDecision({ assessment, allowSelective });
    result.promote = promote;
    result.promoteMode = promote.mode || (promote.promote ? "full" : null);

    // 6. Promote (unless dry-run).
    if (promote.promote && dryRun) {
      result.action = promote.mode === "selective" ? "dry-run-would-promote-selective" : "dry-run-would-promote";
    } else if (promote.promote) {
      try {
        promoteFn({ candidatePath: CANDIDATE_CKPT, livePath: LIVE_CKPT, prevPath: PREV_CKPT });
        result.promoted = true;
        result.action = promote.mode === "selective" ? "promoted-selective" : "promoted";
      } catch (e) {
        errors.push(`promote (checkpoint swap) failed: ${e && e.message ? e.message : e}`);
        result.ok = false;
        result.action = "promote-failed";
      }
    } else {
      result.action = "not-promoted";
    }

    // Active-learning loop closure (AI-SYSTEMS #4): a not-promoted candidate is
    // label-starved, so refresh the operator label worklist. Isolated + fail-soft:
    // recorded on result.activeWorklist only, NEVER affects promotion or result.ok.
    if (!promote.promote && !dryRun) {
      result.activeWorklist = refreshWorklistImpl();
    }

    safeLedger(appendLedger, result, errors);
    return result;
  } finally {
    try {
      releaseLock();
    } catch (e) {
      errors.push(`lock release failed: ${e && e.message ? e.message : e}`);
    }
  }
}

/** Persist the drift baseline; a write failure is advisory, never fatal. */
function recordBaseline(writeBaseline, fingerprint, ts, result, errors) {
  try {
    writeBaseline({
      schemaVersion: SCHEMA_VERSION,
      fingerprint,
      recordedAt: ts,
    });
  } catch (e) {
    errors.push(`baseline write failed: ${e && e.message ? e.message : e}`);
  }
}

/* ------------------------------------------------------------------ *
 * CLI.
 * ------------------------------------------------------------------ */

const USAGE = `nn-graph-retrain-lifecycle — autonomous GNN tier-5 retrain lifecycle

Usage: node scripts/nn-graph-retrain-lifecycle.mjs [options]

  (no args)    poll: fingerprint -> drift gate -> maybe retrain/eval/promote
  --force      retrain regardless of drift
  --dry-run    train + evaluate + decide, but never promote or move the baseline
  --status     print the last ledger entry + live checkpoint state, then exit
  --help       show this help

Exit codes: 0 = ok (skip / promoted / not-promoted / disabled / dry-run);
            1 = operational failure (train / eval / promote / graph-read).`;

export function parseArgs(argv) {
  const out = {};
  const args = Array.isArray(argv) ? argv : [];
  for (const a of args) {
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--force") out.force = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--status") out.status = true;
    else throw new Error(`nn-graph-retrain-lifecycle: unknown argument "${a}" (try --help)`);
  }
  return out;
}

/** Read the tail line of the ledger; null when absent/empty/corrupt. */
function lastLedgerRecord() {
  try {
    const raw = fs.readFileSync(LEDGER_PATH, "utf8").trimEnd();
    if (!raw) return null;
    const lastLine = raw.slice(raw.lastIndexOf("\n") + 1);
    return JSON.parse(lastLine);
  } catch {
    return null;
  }
}

function printStatus() {
  const lines = ["NN-GRAPH retrain lifecycle — status", ""];

  let ckptMeta = null;
  try {
    const ck = JSON.parse(fs.readFileSync(LIVE_CKPT, "utf8"));
    ckptMeta = ck && ck.metadata ? ck.metadata : null;
  } catch {
    /* no live checkpoint */
  }
  if (ckptMeta) {
    lines.push(`Live checkpoint: trained ${ckptMeta.trainedAt || "?"}`);
    lines.push(`  AUROC ${ckptMeta.auroc ?? "n/a"} · epochs ${ckptMeta.epochs ?? "?"} · stratified ${ckptMeta.stratifiedNegatives ? "yes" : "no"}`);
  } else {
    lines.push("Live checkpoint: (none on disk)");
  }

  const base = defaultReadBaseline();
  if (base && base.fingerprint) {
    const f = base.fingerprint;
    lines.push(`Drift baseline: recorded ${base.recordedAt || "?"}`);
    lines.push(`  nodes ${f.nodeCount} · edges ${f.edgeCount} · ghosts ${f.ghostCount}`);
  } else {
    lines.push("Drift baseline: (none — next run is a first-run retrain)");
  }

  const last = lastLedgerRecord();
  if (last) {
    lines.push(`Last run: ${last.ts} — action=${last.action} ok=${last.ok}`);
    if (last.drift) lines.push(`  drift: ${last.drift.reason}`);
    if (last.promote) lines.push(`  promote: ${last.promote.reason}`);
    if (Array.isArray(last.errors) && last.errors.length) {
      lines.push(`  errors: ${last.errors.join("; ")}`);
    }
  } else {
    lines.push("Last run: (no ledger entries yet)");
  }
  console.log(lines.join("\n"));
}

/** Human-readable one-block summary of a runLifecycle result. */
export function renderResult(result) {
  const L = [`nn-graph-retrain-lifecycle: action=${result.action} ok=${result.ok}`];
  if (result.fingerprint) {
    const f = result.fingerprint;
    L.push(`  graph: nodes ${f.nodeCount} · edges ${f.edgeCount} · ghosts ${f.ghostCount}`);
  }
  if (result.drift) L.push(`  drift: ${result.drift.reason}`);
  if (result.trained) L.push(`  trained: yes (exit ${result.trainExitCode})`);
  if (result.assessment) {
    const a = result.assessment;
    if (a.deferred) {
      L.push(`  eval: DEFERRED — ${a.reason}`);
    } else if (a.metrics) {
      L.push(`  eval: AUROC ${a.metrics.auroc ?? "n/a"} · macroF1 ${a.metrics.macroF1 ?? "n/a"} · Brier ${a.metrics.brier ?? "n/a"}`);
    }
  }
  if (result.promote) L.push(`  promote: ${result.promote.reason}`);
  L.push(`  promoted: ${result.promoted}`);
  if (result.errors && result.errors.length) L.push(`  errors: ${result.errors.join("; ")}`);
  return L.join("\n");
}

/**
 * Pure: should the lifecycle RE-EXEC itself with a `--max-old-space-size` bump?
 *
 * The lifecycle runs the EVAL (runAssessment) and the base embedding build
 * IN-PROCESS, each of which loads the ~550MB system graph. Only the spawned
 * TRAINER got a heap bump (line ~288); the lifecycle's own node process did not,
 * so an ad-hoc `node nn-graph-retrain-lifecycle.mjs --force` OOM'd on the
 * in-process graph load at the ~default heap ceiling (regression 2026-06-11).
 * We re-exec once with a heap bump (mirrors the MCP supervisor's NODE_OPTIONS
 * pattern). Cheap modes (--status/--help) never load the graph, so they skip the
 * re-exec. The re-exec child sets PRISM_NN_RETRAIN_REEXEC=1 to break the loop;
 * PRISM_NN_RETRAIN_NO_REEXEC=1 opts out entirely (e.g. a caller that already
 * launched node with its own heap flag).
 * @param {string[]} argv  args after the script (process.argv.slice(2))
 * @param {Record<string,string|undefined>} env
 * @returns {boolean}
 */
export function shouldReexecForHeap(argv, env = {}, execArgv = []) {
  if (env.PRISM_NN_RETRAIN_REEXEC === "1") return false; // already inside the bumped child
  if (env.PRISM_NN_RETRAIN_NO_REEXEC === "1") return false; // explicit opt-out
  if (hasHeapFlag(execArgv)) return false; // already launched WITH a heap bump (e.g. the
  // scheduled task passes --max-old-space-size itself) -> re-exec would add a redundant node.
  const a = Array.isArray(argv) ? argv : [];
  if (a.includes("--status") || a.includes("--help") || a.includes("-h")) return false; // no graph load
  return true;
}

/** True if node was already launched with a `--max-old-space-size` flag (process.execArgv). PURE. */
export function hasHeapFlag(execArgv) {
  return (Array.isArray(execArgv) ? execArgv : []).some(
    (a) => typeof a === "string" && a.startsWith("--max-old-space-size")
  );
}

/**
 * Build the argv to spawn a heap-bumped node child: the `--max-old-space-size` flag MUST come
 * BEFORE the script path (node consumes V8 flags before the script arg). Single source for both
 * heavy spawn sites (self re-exec + the 2c galaxy-embedding child) so a refactor cannot silently
 * drop the flag from one of them and re-introduce the OOM (regression-lock, R9). PURE.
 * @param {string} scriptPath
 * @param {number} heapMb
 * @param {string[]} [scriptArgs]
 * @returns {string[]}
 */
export function nodeArgsWithHeap(scriptPath, heapMb, scriptArgs = []) {
  return [`--max-old-space-size=${heapMb}`, scriptPath, ...(Array.isArray(scriptArgs) ? scriptArgs : [])];
}

/** CLI entry point. Returns a process exit code. */
export function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    console.error(e.message);
    return 2;
  }
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }
  if (opts.status) {
    printStatus();
    return 0;
  }
  const result = runLifecycle({ force: opts.force, dryRun: opts.dryRun });
  console.log(renderResult(result));

  // H4 U-NEURAL-FEEDBACK-LOOP: convert this round's telemetry into a durable,
  // verifiable memory entry. The feedback step is idempotent (it tracks
  // already-captured rounds) and ADVISORY — a feedback failure must never fail
  // the lifecycle run itself.
  if (!opts.dryRun && result.action !== "disabled") {
    try {
      const fb = spawnSync(process.execPath,
        [path.join(ROOT, "scripts", "nn-feedback-to-memory.mjs")],
        { stdio: "inherit", cwd: ROOT });
      if (fb.status !== 0) console.error(`[nn-feedback] exit ${fb.status ?? "signal"}`);
    } catch (e) {
      console.error(`[nn-feedback] spawn failed — ${e && e.message ? e.message : e}`);
    }
  }

  return result.ok ? 0 : 1;
}

const __isMain = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1] || "").href;
  } catch {
    return false;
  }
})();
if (__isMain) {
  // Heap guard (regression 2026-06-11): re-exec once with a --max-old-space-size
  // bump so the in-process eval/embedding graph loads don't OOM at the default
  // ceiling. shouldReexecForHeap keeps cheap modes (--status/--help) fast.
  if (shouldReexecForHeap(process.argv.slice(2), process.env, process.execArgv)) {
    const heapMb = Number(process.env.PRISM_NN_RETRAIN_LIFECYCLE_HEAP_MB) || LIFECYCLE_DEFAULTS.heapMb;
    const r = spawnSync(
      process.execPath,
      nodeArgsWithHeap(process.argv[1], heapMb, process.argv.slice(2)),
      { stdio: "inherit", cwd: ROOT, env: { ...process.env, PRISM_NN_RETRAIN_REEXEC: "1" } }
    );
    process.exit(typeof r.status === "number" ? r.status : 1);
  }
  process.exit(main(process.argv.slice(2)));
}
