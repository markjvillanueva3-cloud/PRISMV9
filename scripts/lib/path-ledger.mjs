#!/usr/bin/env node
// scripts/lib/path-ledger.mjs — WORKING-PATH-CAPTURE-MS0 (alpha, 2026-05-31).
//
// Fleet-wide ledger of action-TRAJECTORIES toward goals. The operator doctrine:
// "plot your path / track your movements; when a working path to a goal is proven,
// wire it into the AI system to drive autonomous CAD/CAM that keeps learning; add it
// to the learning system; propagate across galaxies so we compound-learn."
//
// PRISM already EXECUTES goals but throws away the TRAJECTORY. This captures the proven
// action sequence per (domain, goalType) so a one-shot success becomes a replayable,
// compounding asset:
//   recordStep ───▶ active trajectory breadcrumbs (state/shared/path-ledger/active/<id>.jsonl)
//   captureWorkingPath ─▶ promote a succeeded trajectory → working-paths.jsonl (atomic, dedup)
//   findWorkingPaths ──▶ retrieve proven paths (exact + optional kNN over goal-embeddings = acceleration)
//   toExecutionPlan ───▶ adapt a WorkingPath → an ordered ExecutionPlan for the autonomous executor
//   emitLearningRow ───▶ a labeled row into india's OutcomeFeedbackBus (state/shared/outcome-bus.jsonl)
//
// REUSE (R8 — wires into the existing backbone, does NOT duplicate it):
//   • atomic store      → scripts/lib/exclusive-file-lock.mjs (O_EXCL lock shipped this session)
//   • learning sink     → india's OutcomeFeedbackBus; "learning signal goes through india"
//                         (mcp-server/src/engines/ai-training/CLAUDE.md). Row schema mirrors
//                         .claude/hooks/outcome-bus-auto-tap.mjs so india's consumers parse it.
//   • autonomous replay → autonomousDispatcher auto_execute consumes an ordered step plan.
//
// DESIGN: pure-core + injected deps ({roots, now, embed, slot, sessionId}). FAIL-SOFT — this is an
// OPTIMIZATION (like galaxy-synthesis-claim's ledger), NEVER a correctness gate: every consumer-facing
// fn swallows its own errors and returns a benign result rather than throwing into the work loop.
//
// Knob: PRISM_PATH_LEDGER_DISABLE=1 → recordStep/capture/emit become no-ops (read fns still work).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { withExclusiveLock } from "./exclusive-file-lock.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";

export const DEFAULT_ROOTS = Object.freeze({
  activeDir: `${PRISM_ROOT}/state/shared/path-ledger/active`,
  workingPaths: `${PRISM_ROOT}/state/shared/path-ledger/working-paths.jsonl`,
  outcomeBus: `${PRISM_ROOT}/state/shared/outcome-bus.jsonl`,
});

// Slot → galaxy/domain. KEEP-IN-SYNC with .claude/hooks/outcome-bus-auto-tap.mjs SLOT_GALAXY_MAP
// (the canonical source). Vendored (not imported) because that file is a hook with stdin side effects.
// NOTE (scrutiny 2026-05-31): the producer hook has a DUPLICATE `zulu` key (last-wins → "u-dea");
// this copy's effective values match it. If the producer is ever de-duped (which would flip zulu→
// "hermes-zulu"), re-sync this map — the LAST-WINS effective value is canonical, not the first.
export const SLOT_GALAXY_MAP = Object.freeze({
  alpha: "token-optimization", bravo: "hermes-zulu", charlie: "quoting", delta: "cad",
  echo: "post-processor", foxtrot: "mill", golf: "fleet-reaper", hotel: "business",
  india: "ai-training", juliett: "database", kilo: "cam", lima: "academy", mike: "wedm",
  november: "u-dea", oscar: "speed-feed", papa: "backend-helper", quebec: "frontend",
  romeo: "wiring", sierra: "system-viz", tango: "discovery", uniform: "bug-hunting",
  victor: "dormant-data", whiskey: "lathe", xray: "blueprint-vision", zulu: "u-dea",
});

export function resolveDomain(slot) {
  return SLOT_GALAXY_MAP[slot] || (slot ? `${slot}-unknown` : "unknown");
}

const DISABLED = () => process.env.PRISM_PATH_LEDGER_DISABLE === "1"; // read at call-time (decoupled)

// ── helpers ─────────────────────────────────────────────────────────────────

// pathId must be a safe filename fragment — reject traversal/separators so a caller
// can never escape activeDir. Returns null for an unusable id (fail-soft upstream).
export function safePathId(id) {
  if (typeof id !== "string" || !id) return null;
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(id)) return null;
  if (id === "." || id === "..") return null;
  return id;
}

function sha16(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 16);
}

// Stable fingerprint of a trajectory: ordered (action|argsDigest) pairs. Two paths with
// the same ordered actions+arg-shapes are the SAME working path (dedup key component).
export function stepsHash(steps) {
  const norm = (Array.isArray(steps) ? steps : [])
    .map((s) => `${s && s.action ? s.action : ""}|${s && s.argsDigest ? s.argsDigest : ""}`)
    .join(">");
  return sha16(norm);
}

function nowIso(now) {
  if (now instanceof Date) return now.toISOString();
  if (typeof now === "string") return now;
  return new Date().toISOString();
}

// A short, non-secret digest of step args (callers may also pass argsDigest directly).
export function digestArgs(args) {
  if (args == null) return "";
  let s;
  try { s = typeof args === "string" ? args : JSON.stringify(args); } catch { s = String(args); }
  return sha16(s);
}

// ── recordStep — plot one movement of the active trajectory ───────────────────
/**
 * @returns {{ok:boolean, seq?:number, reason?:string}}
 */
export function recordStep(pathId, step, opts = {}) {
  if (DISABLED()) return { ok: false, reason: "disabled" };
  const roots = opts.roots || DEFAULT_ROOTS;
  const id = safePathId(pathId);
  if (!id) return { ok: false, reason: "bad-pathId" };
  if (!step || typeof step !== "object" || !step.action) return { ok: false, reason: "bad-step" };
  try {
    fs.mkdirSync(roots.activeDir, { recursive: true });
    const file = path.join(roots.activeDir, `${id}.jsonl`);
    // seq = current line count (cheap; the trajectory is short-lived + append-only)
    let seq = 0;
    try { seq = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).length; } catch { /* new */ }
    const row = {
      seq,
      action: String(step.action),
      argsDigest: step.argsDigest != null ? String(step.argsDigest) : digestArgs(step.args),
      ts: nowIso(opts.now),
    };
    fs.appendFileSync(file, JSON.stringify(row) + "\n");
    return { ok: true, seq };
  } catch (e) {
    return { ok: false, reason: e && e.code ? e.code : "io" };
  }
}

export function readActiveSteps(pathId, opts = {}) {
  const roots = opts.roots || DEFAULT_ROOTS;
  const id = safePathId(pathId);
  if (!id) return [];
  try {
    const file = path.join(roots.activeDir, `${id}.jsonl`);
    return fs.readFileSync(file, "utf8").split("\n").filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean)
      .sort((a, b) => (a.seq || 0) - (b.seq || 0));
  } catch { return []; }
}

// ── captureWorkingPath — promote a finished trajectory to a reusable WorkingPath ──
/**
 * meta: { domain, goalType, goal?, outcome:{success:boolean,...}, score?, slot?, sessionId? }
 * Atomic append+dedup under the exclusive lock (dedup key = domain::goalType::stepsHash).
 * A repeat capture of the same path UPDATES the prior row's score/outcome (last-writer) rather
 * than appending a duplicate. Negative paths (outcome.success===false) ARE captured (flagged
 * working:false) so selection can avoid known dead-ends (acceleration plan #6).
 * @returns {{captured:boolean, workingPathId?:string, deduped?:boolean, reason?:string}}
 */
export function captureWorkingPath(pathId, meta = {}, opts = {}) {
  if (DISABLED()) return { captured: false, reason: "disabled" };
  const roots = opts.roots || DEFAULT_ROOTS;
  const steps = opts.steps || readActiveSteps(pathId, opts);
  if (!steps.length) return { captured: false, reason: "no-steps" };
  const domain = meta.domain || resolveDomain(meta.slot);
  const goalType = meta.goalType || "generic";
  const sh = stepsHash(steps);
  const workingPathId = `${domain}::${goalType}::${sh}`;
  const success = !!(meta.outcome && meta.outcome.success);
  const wp = {
    workingPathId, domain, goalType,
    goal: meta.goal ? String(meta.goal).slice(0, 400) : "",
    steps: steps.map((s) => ({ seq: s.seq, action: s.action, argsDigest: s.argsDigest })),
    stepsCount: steps.length,
    outcome: meta.outcome || { success: false },
    working: success,
    score: Number.isFinite(meta.score) ? meta.score : (success ? 1 : 0),
    sourceSession: meta.sessionId || "",
    // provenance distinguishes an EXPLICITLY-proven path (a chat that achieved the goal captured it)
    // from a DERIVED hypothesis (harvested from the outcome-bus inter-commit trail by path-derive.mjs —
    // may contain false starts; replay-success should be confirmed before trusting it). Consumers +
    // india's learner can weight/gate on this. Default "explicit".
    provenance: meta.provenance === "derived" ? "derived" : "explicit",
    capturedAt: nowIso(opts.now),
  };
  const lockPath = `${roots.workingPaths}.lock`;
  try {
    fs.mkdirSync(path.dirname(roots.workingPaths), { recursive: true });
    const r = withExclusiveLock(lockPath, () => {
      let rows = [];
      try {
        rows = fs.readFileSync(roots.workingPaths, "utf8").split("\n").filter(Boolean)
          .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      } catch { rows = []; }
      const idx = rows.findIndex((x) => x && x.workingPathId === workingPathId);
      let deduped = false;
      if (idx >= 0) { rows[idx] = { ...rows[idx], ...wp, captureCount: (rows[idx].captureCount || 1) + 1 }; deduped = true; }
      else { rows.push({ ...wp, captureCount: 1 }); }
      const tmp = `${roots.workingPaths}.tmp.${process.pid}`;
      fs.writeFileSync(tmp, rows.map((x) => JSON.stringify(x)).join("\n") + "\n");
      fs.renameSync(tmp, roots.workingPaths);
      return { deduped };
    }, { staleMs: 30_000 });
    if (!r.ran) return { captured: false, reason: "lock-contended" }; // peer holds it — caller may retry
    return { captured: true, workingPathId, deduped: r.value.deduped };
  } catch (e) {
    return { captured: false, reason: e && e.code ? e.code : "io" };
  }
}

export function readWorkingPaths(opts = {}) {
  const roots = opts.roots || DEFAULT_ROOTS;
  try {
    return fs.readFileSync(roots.workingPaths, "utf8").split("\n").filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

// ── findWorkingPaths — retrieve proven paths for a goal (acceleration entry) ──
/**
 * opts.embed?: (text)=>number[]  — when provided AND opts.query given, rank by cosine over
 *   goal-embeddings (the kNN memoization lever). Without it, exact (domain,goalType) filter.
 * opts.query?: string · opts.topK?: number (default 5) · opts.includeNegative?: boolean (default false)
 * @returns {Array<WorkingPath & {similarity?:number}>} sorted best-first.
 */
export function findWorkingPaths(domain, goalType, opts = {}) {
  const rows = readWorkingPaths(opts);
  let cands = rows.filter((r) => r && r.domain === domain && (!goalType || r.goalType === goalType));
  if (!opts.includeNegative) cands = cands.filter((r) => r.working !== false);
  if (typeof opts.embed === "function" && opts.query) {
    let qv;
    try { qv = opts.embed(opts.query); } catch { qv = null; }
    if (Array.isArray(qv)) {
      cands = cands.map((r) => {
        let sim = 0;
        try { const rv = opts.embed(r.goal || r.goalType); sim = cosine(qv, rv); } catch { sim = 0; }
        return { ...r, similarity: sim };
      }).sort((a, b) => (b.similarity - a.similarity) || (b.score - a.score));
      return cands.slice(0, opts.topK || 5);
    }
  }
  cands.sort((a, b) => (b.score - a.score) || ((b.captureCount || 1) - (a.captureCount || 1)));
  return cands.slice(0, opts.topK || 5);
}

function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ── toExecutionPlan — adapt a WorkingPath → ordered plan for the autonomous executor ──
// Generic, documented plan shape: an ordered action list the autonomousDispatcher's auto_execute
// can replay. The exact field-rename onto autonomousActionSchemas' ExecutionPlan is a thin
// adoption step (delta/kilo wire it into their dispatcher); this preserves order + params + origin.
export function toExecutionPlan(workingPath) {
  const wp = workingPath || {};
  const steps = Array.isArray(wp.steps) ? wp.steps : [];
  return {
    plan_id: `plan:${wp.workingPathId || "unknown"}`,
    origin: "path-ledger",
    domain: wp.domain || "unknown",
    goalType: wp.goalType || "generic",
    source_working_path: wp.workingPathId || "",
    total_steps: steps.length,
    steps: steps.map((s, i) => ({ seq: Number.isFinite(s.seq) ? s.seq : i, action: s.action, argsDigest: s.argsDigest || "" })),
  };
}

// ── emitLearningRow — labeled row into india's OutcomeFeedbackBus ─────────────
// Schema mirrors outcome-bus-auto-tap.mjs so the row is a first-class citizen of india's canonical
// OutcomeFeedbackBus (state/shared/outcome-bus.jsonl). HONESTY (scrutiny 2026-05-31, R12): placing
// the row on the bus completes the WIRE ("learning signal goes through india"); whether india's
// retrain consumers (NN-GRAPH / LoRA / meta-learn) ingest it on their cadence is india's downstream —
// coordinated via the U-WPC-INDIA-COORD note, NOT assumed already-live here. `previously_failed:false`
// is correct: a working-path capture is a one-shot success, not a fail→success repair pair (so the
// fix-pair consumer stop-auto-capture-per-slot.mjs intentionally skips it; the full-stream consumers don't).
/**
 * @returns {{emitted:boolean, row?:object, reason?:string}}
 */
export function emitLearningRow(workingPath, opts = {}) {
  if (DISABLED()) return { emitted: false, reason: "disabled" };
  const roots = opts.roots || DEFAULT_ROOTS;
  const wp = workingPath || {};
  const slot = opts.slot || "";
  const domain = wp.domain || resolveDomain(slot);
  const row = {
    ts: nowIso(opts.now),
    source: "path-ledger",
    session_id: opts.sessionId || wp.sourceSession || "",
    slot,
    domain,
    tool: "WorkingPath",
    success: wp.working !== false,
    hint: `goal:${wp.goalType || "generic"}`,
    task: `workingpath:${wp.goalType || "generic"}`,
    previously_failed: false,
    // additive (path-ledger):
    working_path_id: wp.workingPathId || "",
    steps_count: wp.stepsCount || (Array.isArray(wp.steps) ? wp.steps.length : 0),
    score: Number.isFinite(wp.score) ? wp.score : 0,
  };
  try {
    fs.mkdirSync(path.dirname(roots.outcomeBus), { recursive: true });
    fs.appendFileSync(roots.outcomeBus, JSON.stringify(row) + "\n");
    return { emitted: true, row };
  } catch (e) {
    return { emitted: false, reason: e && e.code ? e.code : "io", row };
  }
}
