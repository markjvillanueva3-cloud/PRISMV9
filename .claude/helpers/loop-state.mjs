#!/usr/bin/env node
/**
 * loop-state.mjs — Per-session /loop iteration state helper.
 *
 * Why: `/loop` runs N iterations of a task. If a chat crashes mid-loop, the next
 * chat has no idea the loop was running. This helper persists iteration metadata
 * so /loop can resume cleanly + surface "you have a paused loop" warnings on /checkin.
 *
 * Layout: state/shared/loop-state/loop-<session-id>.json
 *
 * Usage:
 *   node loop-state.mjs start --session <sid> --task "<task>" --target 20
 *   node loop-state.mjs tick  --session <sid> --status ok|fail --note "<one-line>"
 *   node loop-state.mjs read  --session <sid>             # JSON
 *   node loop-state.mjs end   --session <sid> --reason "<why>"
 *   node loop-state.mjs list                              # all active loops
 *   node loop-state.mjs reap                              # remove stale (>4h inactive)
 *
 * Iteration record: { iter, ts, status, note, tokensApprox }
 *
 * Karpathy R10: checkpoint after every significant step.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
// RGS-PLANNING-LOOP-BRIDGE-MS0/U3 (2026-06-11, slot:tango): import the SINGLE-OWNER
// unit classifier (the same one priority-queue.mjs uses) so eval scores key by the
// identical backend-dev|bridge|app-functionality taxonomy U4 re-ranks on. Side-effect
// free (isMain-guarded); do NOT re-derive the BACKEND_DEV_MS taxonomy here (dedup law).
import { classifyUnit } from "../../scripts/generate-priority-queue-features.mjs";
// RGS-PLANNING-LOOP-BRIDGE-MS0/U5 (2026-06-11, slot:tango): the loop decision core.
import { decidePlanningAction, EVAL_PASS_THRESHOLD, RERANK_WINDOW } from "../../scripts/lib/planning-loop.mjs";

const STATE_DIR = path.join("H:", "prism", "state", "shared", "loop-state");
const STALE_MS = 4 * 60 * 60 * 1000; // 4h inactive → reap

function statePath(sid) {
  const safe = String(sid || "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "global";
  return path.join(STATE_DIR, `loop-${safe}.json`);
}

function ensureDir() { fs.mkdirSync(STATE_DIR, { recursive: true }); }

function read(sid) {
  try { return JSON.parse(fs.readFileSync(statePath(sid), "utf-8")); } catch { return null; }
}

function write(sid, state) {
  ensureDir();
  fs.writeFileSync(statePath(sid), JSON.stringify(state, null, 2) + "\n");
}

// 2026-05-26 (U-LOOP-STATE-CLI-FLAG-ALIAS, slot:alpha): `--session-id` accepted
// as a synonym for `--session`. Callers in the wild (per-slot wrappers, audit
// scripts, the iter-1 tick I tried) pass `--session-id` from the harness's
// `session_id` JSON field; rejecting it broke iter-counter accuracy
// (B6 in DORMANT-FEATURES-ENUMERATION-2026-05-26). Alias also covers
// `--sessionId` (camelCase) for completeness.
const FLAG_ALIASES = { "session-id": "session", "sessionId": "session" };
function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const rawKey = a.slice(2);
      const key = FLAG_ALIASES[rawKey] || rawKey;
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) { flags[key] = next; i++; }
      else flags[key] = true;
    }
  }
  return flags;
}

// RGS-PLANNING-LOOP-BRIDGE-MS0/U3 (2026-06-11, slot:tango): eval-score capture +
// per-unit-type running mean. Pure helpers, exported for direct testing.

/** Parse a numeric --eval-score flag. PURE. P0 GUARD (U-SPEC-V2): a bare
 *  `--eval-score` with no token is stored as boolean `true` by parseFlags, and
 *  `Number(true) === 1` would write a spurious PERFECT pass. Only a real numeric
 *  STRING token yields a score; bare flag / junk / absent all -> null. */
export function parseEvalScore(raw) {
  return (typeof raw === "string" && Number.isFinite(Number(raw))) ? Number(raw) : null;
}

/** Welford running-mean update for a {n,mean} accumulator. PURE, monotone-stabilizing
 *  (a lone outlier cannot flip an established mean as n grows -> U4 re-rank convergence). */
export function welfordUpdate(acc, x) {
  const prevN = (acc && Number.isFinite(acc.n)) ? acc.n : 0;
  const prevMean = (acc && Number.isFinite(acc.mean)) ? acc.mean : 0;
  const n = prevN + 1;
  return { n, mean: prevMean + (x - prevMean) / n };
}

/** Derive the classifyUnit category for the loop's current task. PURE. An explicit
 *  `--unit-type` (passed by the U7 substrate hook, which already classified) wins;
 *  else extract a leading MILESTONE token (e.g. RGS-PLANNING-LOOP-BRIDGE-MS0) and run
 *  the SINGLE-OWNER classifyUnit so the key matches U4's pick-time keys. No extractable
 *  milestone -> "unknown" (never guesses a real category). */
export function deriveUnitType(explicitType, task) {
  if (typeof explicitType === "string" && explicitType.trim()) return explicitType.trim();
  const m = String(task || "").match(/\b([A-Z][A-Z0-9]+(?:-[A-Z0-9]+)+)\b/);
  if (!m) return "unknown";
  return classifyUnit({ milestone: m[1] }).category;
}

// RGS-PLANNING-LOOP-BRIDGE-MS0/U5 (2026-06-11, slot:tango): derive the U1 decision
// inputs from a loop-state object. PURE. recentEvals = last RERANK_WINDOW finite
// evalScores; consecutiveFails = trailing run of (evalScore<PASS or status==='fail');
// budgetRemaining = target-iter; replansSoFar = replanLog length (drives the cap).
export function deriveLoopSignals(state, { window = RERANK_WINDOW } = {}) {
  const iters = Array.isArray(state?.iterations) ? state.iterations : [];
  const recentEvals = iters.slice(-window).map((it) => it && it.evalScore).filter((v) => Number.isFinite(v));
  let consecutiveFails = 0;
  for (let i = iters.length - 1; i >= 0; i--) {
    const it = iters[i] || {};
    const failed = Number.isFinite(it.evalScore) ? it.evalScore < EVAL_PASS_THRESHOLD : it.status === "fail";
    if (failed) consecutiveFails++; else break;
  }
  const target = Number(state?.target) || 0;
  const iter = Number(state?.iter) || 0;
  const budgetRemaining = target > 0 ? target - iter : Infinity;
  const replansSoFar = Array.isArray(state?.replanLog) ? state.replanLog.length : 0;
  return { recentEvals, consecutiveFails, budgetRemaining, replansSoFar };
}

// U5: bounded ATCS replan attempt. HONEST BY CONSTRUCTION (R12): the mainstream
// /loop never initializes the autonomous-tasks queue (PRISM_ROOT/autonomous-tasks),
// so this reports 'skipped' rather than a false 'executed'. An active task is
// reported 'deferred' -- the real requeue needs the built atcsDispatcher (MS1).
export function attemptAtcsReplan({ root } = {}) {
  const dir = path.join(root || REPO, "autonomous-tasks");
  let hasActive = false;
  try {
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
      try { const t = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")); if (t && t.status === "active") { hasActive = true; break; } } catch { /* skip */ }
    }
  } catch { hasActive = false; }
  return hasActive
    ? { status: "deferred", reason: "active ATCS task found but requeue requires the built atcsDispatcher (wire in MS1)" }
    : { status: "skipped", reason: "no active ATCS task (autonomous-tasks queue absent or empty)" };
}

function cmdStart(flags) {
  if (!flags.session) throw new Error("--session required");
  const state = {
    schemaVersion: "1.0.0",
    sessionId: flags.session,
    task: flags.task || "(unspecified)",
    target: Number(flags.target) || 20,
    startedAt: new Date().toISOString(),
    lastTickAt: new Date().toISOString(),
    iter: 0,
    iterations: [],
    // U3: per-unit-type running eval means {type: {n, mean}}. Carried across rolls by U0.
    evalsByType: {},
    status: "running",
    // U-LOOP-AUTO-ADVANCE: persist the slot so the loop-iteration injector can
    // emit a `--slot` for the `next` auto-advance pick-unit fallback. Optional.
    slot: typeof flags.slot === "string" ? flags.slot : null,
  };
  write(flags.session, state);
  process.stdout.write(JSON.stringify({ ok: true, started: true, target: state.target }) + "\n");
}

function cmdTick(flags) {
  if (!flags.session) throw new Error("--session required");
  const state = read(flags.session);
  if (!state) { process.stdout.write(JSON.stringify({ ok: false, error: "no loop state — run `start` first" }) + "\n"); return; }
  state.iter++;
  state.lastTickAt = new Date().toISOString();
  // U3: numeric eval signal (0..1) for this iteration. null when not supplied or
  // malformed (the P0 bare-flag guard lives in parseEvalScore). When a fail status
  // carries no score, synthesize 0.0 so the fail is not dropped by U1's null-filter.
  let evalScore = parseEvalScore(flags["eval-score"]);
  if (evalScore === null && flags.status === "fail") evalScore = 0.0;
  state.iterations.push({
    iter: state.iter,
    ts: state.lastTickAt,
    status: flags.status || "ok",
    note: flags.note || null,
    evalScore,
  });
  // U3: fold the score into the per-unit-type running mean so U4 can re-rank.
  if (evalScore !== null) {
    state.evalsByType = state.evalsByType || {};
    const type = deriveUnitType(flags["unit-type"], state.task);
    state.evalsByType[type] = welfordUpdate(state.evalsByType[type], evalScore);
  }
  // Runaway guard: if iter > 2× target, mark abandoned
  if (state.iter > state.target * 2) { state.status = "abandoned"; state.abandonReason = "exceeded 2× target"; }
  write(flags.session, state);
  process.stdout.write(JSON.stringify({ ok: true, iter: state.iter, target: state.target, status: state.status, evalScore }) + "\n");
}

function cmdRead(flags) {
  if (!flags.session) throw new Error("--session required");
  const state = read(flags.session);
  process.stdout.write(JSON.stringify(state || { ok: false, error: "no state" }) + "\n");
}

function cmdEnd(flags) {
  if (!flags.session) throw new Error("--session required");
  const state = read(flags.session);
  if (!state) { process.stdout.write(JSON.stringify({ ok: false, error: "no state" }) + "\n"); return; }
  state.status = "ended";
  state.endedAt = new Date().toISOString();
  state.endReason = flags.reason || null;
  write(flags.session, state);
  process.stdout.write(JSON.stringify({ ok: true, ended: true, iter: state.iter }) + "\n");
}

// 2026-06-08 (U-LOOP-AUTO-ADVANCE, slot:india): resolve the NEXT unit/task so a
// /loop auto-continues instead of ending and waiting for a human "continue"
// prompt. Precedence (first non-empty wins):
//   1. --resume "<directive>"  — caller-supplied (the loop's own next-action line)
//   2. handoff ## RESUME line   — this terminal's per-agent handoff RESUME directive
//   3. pick-unit.mjs slot slice — top roadmap candidate for the slot
// Emits { ok, nextTask, source, exhausted }. `exhausted:true` (no nextTask from
// any source) is the ONLY honest signal to stop the loop (R12 — don't fabricate
// a task, don't loop forever). Pure resolution + a child-process read of two
// existing helpers; never mutates roadmap/claim state.
import { spawnSync } from "node:child_process";

const REPO = path.join("H:", "prism");

/** Extract the `## RESUME` section body from a per-agent handoff markdown blob. */
function extractResume(content) {
  if (typeof content !== "string") return "";
  const m = content.match(/##\s*RESUME\s*\n([\s\S]*?)(?:\n##\s|\n---|$)/i);
  return m ? m[1].trim() : "";
}

// Handoff match modes that mean "THIS terminal's own handoff". Anything else
// (e.g. "family-latest") is the per-agent-handoff CROSS-SESSION fallback — it
// returns a PEER slot's handoff when this terminal has none, which would make
// the loop auto-advance onto another slot's claimed work (verified live: a bogus
// terminal returned oscar's RESUME). We REJECT those: a wrong next-unit is worse
// than no next-unit (precedence falls through to pick-unit). Scrutiny P1 fix.
const HANDOFF_OWN_MATCH = new Set([
  "same-instance-newest", "same-instance", "exact", "terminal-exact", "instance-exact",
]);

/**
 * Read THIS terminal's OWN handoff RESUME directive. Returns "" on any failure
 * AND on any cross-session/family fallback match (so we never inherit a peer's
 * next-action line). Also belt-and-suspenders: the returned file basename must
 * contain the terminal id.
 */
function handoffResume(terminal) {
  if (!terminal) return "";
  try {
    const r = spawnSync(
      process.execPath,
      [path.join(REPO, ".claude", "helpers", "per-agent-handoff.mjs"), "read", "--terminal", String(terminal)],
      { encoding: "utf-8", timeout: 15000, cwd: REPO },
    );
    if (r.status !== 0 || !r.stdout) return "";
    const j = JSON.parse(r.stdout);
    if (!j.ok) return "";
    // Reject cross-session fallback matches — only an own-instance match counts.
    if (j.matchedBy && !HANDOFF_OWN_MATCH.has(String(j.matchedBy))) return "";
    // Belt-and-suspenders: the matched file must actually name this terminal.
    const base = String(j.file || "");
    const termId = String(terminal).replace(/^claude-/, "");
    if (base && termId && !base.includes(termId)) return "";
    return extractResume(j.content);
  } catch { return ""; }
}

/** Run pick-unit.mjs once; return the top "1." line (empty on any failure).
 *  Test seam: PRISM_LOOP_NEXT_NO_PICKUNIT=1 forces "" (no roadmap pick) so the
 *  exhaustion path is deterministically reachable in tests (the live roadmap
 *  always has hundreds of units, making real exhaustion otherwise unhittable). */
function pickUnitOnce(slot, chatId) {
  if (process.env.PRISM_LOOP_NEXT_NO_PICKUNIT === "1") return "";
  try {
    const args = [path.join(REPO, "scripts", "pick-unit.mjs")];
    if (slot) args.push("--slot", String(slot));
    // chatId lets pick-unit's PER-SLOT-CLAIM filter exclude peer-claimed units.
    if (chatId) args.push("--chatId", String(chatId));
    const r = spawnSync(process.execPath, args, { encoding: "utf-8", timeout: 30000, cwd: REPO });
    if (r.status !== 0 || !r.stdout) return "";
    // pick-unit prints "1. [lane/tier] MILESTONE / U-ID\n   <title>\n   spec: ..."
    const m = r.stdout.match(/^\s*1\.\s*(?:\[[^\]]*\]\s*)?(.+?)\s*$/m);
    return m ? m[1].trim() : "";
  } catch { return ""; }
}

/**
 * Top roadmap candidate, OWN-DOMAIN-FIRST then FLEET-FALLBACK
 * (U-GOAL-CLEAR-ADVANCE, slot:alpha 2026-06-08; operator directive: slots must
 * fall back to remaining queued units on goal-clear instead of idling).
 *   - First try the slot's own lane (`--slot <slot>`).
 *   - If that lane is empty, retry fleet-wide (no `--slot`) so a slot never goes
 *     idle while ANY remaining peer-claim-filtered unit exists.
 * Returns { task, source } — source is "pick-unit" (own lane) or
 * "pick-unit-fleet" (fallback). Empty task on both-empty (the honest stop).
 */
function pickUnitTop(slot, chatId) {
  const own = pickUnitOnce(slot, chatId);
  if (own) return { task: own, source: "pick-unit" };
  // Own lane empty → fleet-wide fallback. FAIL-CLOSED: the fleet pool spans ALL
  // lanes, so without a chatId the PER-SLOT-CLAIM filter can't exclude units a
  // peer slot is actively building — auto-rolling onto peer work is a wrong-work
  // hazard (scrutiny P1). Only fall back fleet-wide when we can peer-claim-filter.
  if (slot && chatId) {
    const fleet = pickUnitOnce("", chatId);
    if (fleet) return { task: fleet, source: "pick-unit-fleet" };
  }
  return { task: "", source: "none" };
}

function resolveNextTask(flags) {
  // 1. explicit caller directive
  const explicit = typeof flags.resume === "string" ? flags.resume.trim() : "";
  if (explicit) return { nextTask: explicit, source: "resume-flag" };
  // 2. handoff RESUME line
  const ho = handoffResume(flags.terminal);
  if (ho) return { nextTask: ho, source: "handoff-resume" };
  // 3. roadmap slice — own lane first, then fleet-wide fallback
  const pu = pickUnitTop(flags.slot, flags.chatId);
  if (pu.task) return { nextTask: pu.task, source: pu.source };
  return { nextTask: "", source: "none" };
}

// `next`: resolve + (by default) ROLL the loop onto the next unit in one call —
// end the current loop record and start a fresh one on the resolved task, so the
// caller (the /loop skill) just re-reads state and keeps going. Pass --resolve-only
// to get the nextTask WITHOUT mutating state (dry-run / decision support).
// P0 runaway bound (scrutiny fix): a roll RESETS per-unit iter to 0, so the
// cmdTick `iter > 2×target` guard cannot bound TOTAL units advanced. Fleet-
// fallback essentially never exhausts (hundreds of queued units), so without a
// roll-chain cap a /loop would auto-advance the entire roadmap unattended — the
// unbounded-autonomy failure R6/R10 forbid. We carry rollsTotal forward and
// refuse to roll past the cap, surfacing exhausted:true + reason:"roll-cap".
// The operator opted into "auto-advance," not "auto-advance forever" — past the
// cap the loop must hand back for a human checkpoint. Knob: PRISM_LOOP_MAX_ROLLS.
const DEFAULT_MAX_ROLLS = 8;
function maxRolls() {
  const n = Number(process.env.PRISM_LOOP_MAX_ROLLS);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MAX_ROLLS;
}

function cmdNext(flags) {
  if (!flags.session) throw new Error("--session required");
  const resolveOnly = !!flags["resolve-only"];
  const prev = read(flags.session);
  const rollsSoFar = prev?.rollsTotal ?? 0;
  const capped = !resolveOnly && rollsSoFar >= maxRolls();

  let { nextTask, source } = resolveNextTask(flags);
  // Roll-cap: even if a next unit IS resolvable, refuse to auto-roll past the cap.
  // Treated as exhaustion so the loop ends and hands back for a human checkpoint.
  if (capped) { nextTask = ""; source = "roll-cap"; }
  const exhausted = !nextTask;

  // U5: the loop decision layer. Roll-cap/exhausted fold into U1's `exhausted`
  // input so U1 (decidePlanningAction) is the SINGLE termination authority --
  // it returns 'stop' for both, no separate branch needed (U-SPEC-V2 fix-P0).
  const decision = decidePlanningAction({ ...deriveLoopSignals(prev), exhausted: exhausted || capped });
  // U5: opt-in bounded ATCS replan on a persistent fail streak. Logged to
  // replanLog (carried across rolls below) so replansSoFar drives the MAX_REPLANS
  // demote-to-stop in U1. Honest: reports 'skipped' when no ATCS task exists.
  let replanResult = null;
  if (decision.action === "replan" && flags["atcs-replan"] && !resolveOnly) {
    replanResult = attemptAtcsReplan();
    if (prev) {
      prev.replanLog = Array.isArray(prev.replanLog) ? prev.replanLog : [];
      prev.replanLog.push({ ts: new Date().toISOString(), at: prev.iter ?? 0, ...replanResult });
      write(flags.session, prev);
    }
  }

  if (resolveOnly || exhausted) {
    // resolve-only is a PURE dry-run — it must NEVER mutate state (scrutiny P1).
    // Only a real (non-dry-run) exhaustion ends the loop.
    if (exhausted && !resolveOnly && prev && prev.status === "running") {
      prev.status = "ended";
      prev.endedAt = new Date().toISOString();
      prev.endReason = capped
        ? `roll-cap: reached PRISM_LOOP_MAX_ROLLS=${maxRolls()} — hand back for human checkpoint`
        : "exhausted: no next unit from any source";
      write(flags.session, prev);
    }
    process.stdout.write(JSON.stringify({
      ok: true, nextTask, source, exhausted, rolled: false,
      planningAction: decision,
      ...(replanResult ? { replanResult } : {}),
      ...(capped ? { reason: "roll-cap", rollsTotal: rollsSoFar, maxRolls: maxRolls() } : {}),
    }) + "\n");
    return;
  }

  // Roll: archive the finished loop's iter count, then start fresh on nextTask.
  // rollsTotal is the SESSION-WIDE advance counter that survives the iter reset.
  const prevIters = prev?.iter ?? 0;
  const target = Number(flags.target) || prev?.target || 20;
  const state = {
    schemaVersion: "1.0.0",
    sessionId: flags.session,
    task: nextTask,
    target,
    slot: prev?.slot ?? (typeof flags.slot === "string" ? flags.slot : null),
    startedAt: new Date().toISOString(),
    lastTickAt: new Date().toISOString(),
    iter: 0,
    iterations: [],
    // U0 (FIX-P0): carry the per-unit-type eval means across the roll. Without this
    // the roll wipes evalsByType -> U4 re-rank is dead after roll #1.
    evalsByType: prev?.evalsByType ?? {},
    // U5: carry the replan ledger across rolls so the MAX_REPLANS cap survives a roll.
    replanLog: prev?.replanLog ?? [],
    status: "running",
    rollsTotal: rollsSoFar + 1,
    rolledFrom: prev ? { task: prev.task, iters: prevIters, endedAt: new Date().toISOString() } : null,
    advanceSource: source,
  };
  write(flags.session, state);
  process.stdout.write(JSON.stringify({
    ok: true, nextTask, source, exhausted: false, rolled: true, prevIters, rollsTotal: state.rollsTotal,
    planningAction: decision,
    ...(replanResult ? { replanResult } : {}),
  }) + "\n");
}

function cmdList() {
  ensureDir();
  const files = fs.readdirSync(STATE_DIR).filter((f) => f.startsWith("loop-") && f.endsWith(".json"));
  const out = [];
  for (const f of files) {
    try {
      const s = JSON.parse(fs.readFileSync(path.join(STATE_DIR, f), "utf-8"));
      out.push({
        sessionId: s.sessionId, task: s.task, iter: s.iter, target: s.target,
        status: s.status, lastTickAt: s.lastTickAt,
        staleMs: Date.now() - new Date(s.lastTickAt).getTime(),
      });
    } catch { /* skip */ }
  }
  out.sort((a, b) => a.staleMs - b.staleMs);
  process.stdout.write(JSON.stringify({ ok: true, count: out.length, loops: out }, null, 2) + "\n");
}

function cmdReap() {
  ensureDir();
  const now = Date.now();
  const files = fs.readdirSync(STATE_DIR).filter((f) => f.startsWith("loop-") && f.endsWith(".json"));
  let reaped = 0;
  for (const f of files) {
    try {
      const fp = path.join(STATE_DIR, f);
      const s = JSON.parse(fs.readFileSync(fp, "utf-8"));
      const age = now - new Date(s.lastTickAt || s.startedAt).getTime();
      if (s.status !== "running" && age > STALE_MS) { fs.unlinkSync(fp); reaped++; }
      else if (s.status === "running" && age > STALE_MS) {
        s.status = "stale";
        fs.writeFileSync(fp, JSON.stringify(s, null, 2) + "\n");
      }
    } catch { /* skip */ }
  }
  process.stdout.write(JSON.stringify({ ok: true, reaped }) + "\n");
}

// 2026-06-10 (U-LOOP-NARRATE-WIRE, slot:alpha): wire the verified-offload loop
// narrator (scripts/ollama-loop-narrate.mjs) into loop-state as an ADDITIVE async
// subcommand. Existing commands (start/tick/read/end/next/list/reap) are UNCHANGED --
// narrate is opt-in, called by the /loop skill AFTER an iteration's tests. The
// narration is advisory model prose; the pass/fail VERDICT stays code-decided
// (narrateIteration's isCleanExitZero). verdictMismatch flags (fail-loud) when the
// tick's recorded status disagrees with the code-decided pass -- a /loop lying about
// iteration success. The narrator is dependency-INJECTED so the command is hermetic.

/** PURE: does the tick's recorded status ("ok"/"fail") disagree with the code-decided
 *  pass? Returns false when either side is unknown (never claims a mismatch on missing data). */
export function computeVerdictMismatch(recordedStatus, passed) {
  if (typeof passed !== "boolean" || typeof recordedStatus !== "string") return false;
  return (recordedStatus === "ok") !== passed;
}

// default narrator: DYNAMIC import so start/tick/read/end/next never load the
// ollama/verifiedOffload chain. Tests inject a fake via opts.narrate (no network).
async function defaultNarrate(args) {
  const mod = await import(new URL("../../scripts/ollama-loop-narrate.mjs", import.meta.url));
  return mod.narrateIteration(args);
}

export async function cmdNarrate(flags, opts = {}) {
  if (!flags.session) throw new Error("--session required");
  const state = read(flags.session);
  if (!state) { process.stdout.write(JSON.stringify({ ok: false, error: "no loop state -- run `start` first" }) + "\n"); return; }
  let testOutput = typeof flags["test-output"] === "string" ? flags["test-output"] : "";
  if (testOutput.startsWith("@")) { try { testOutput = fs.readFileSync(testOutput.slice(1), "utf-8"); } catch { testOutput = ""; } }
  const diff = typeof flags.diff === "string" ? flags.diff : "";
  const narrate = typeof opts.narrate === "function" ? opts.narrate : defaultNarrate;

  // fail-soft: narration is advisory; a narrator failure must NEVER break the loop record.
  let narration = null, passed = null, source = "error";
  try {
    const r = await narrate({ diff, testExit: flags["test-exit"], testOutput });
    if (r && typeof r === "object") {
      narration = r.summary ?? null;
      passed = typeof r.passed === "boolean" ? r.passed : null;
      source = r.source || "unknown";
    }
  } catch { /* fail-soft -- leave narration null, source "error" */ }

  const last = state.iterations.length ? state.iterations[state.iterations.length - 1] : null;
  const verdictMismatch = last ? computeVerdictMismatch(last.status, passed) : false;
  if (last) { last.narration = narration; if (verdictMismatch) last.verdictMismatch = true; }
  state.lastNarration = { narration, passed, source, verdictMismatch, ts: new Date().toISOString() };
  write(flags.session, state);
  process.stdout.write(JSON.stringify({ ok: true, narration, passed, source, verdictMismatch }) + "\n");
}

// CLI-entry guard: only run the dispatch when invoked directly (node loop-state.mjs).
// Required so importing the exported pure fns (computeVerdictMismatch/cmdNarrate) for
// tests does NOT execute the dispatch (which would process.exit on a non-matching cmd).
// Direct CLI behavior is unchanged: process.argv[1] === this file -> dispatch runs.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const flags = parseFlags(argv.slice(1));
  // async IIFE: behavior-preserving for the sync commands (they complete + write
  // synchronously inside the try); only `narrate` awaits. void = intentional top-level.
  void (async () => {
    try {
      if (cmd === "start") cmdStart(flags);
      else if (cmd === "tick") cmdTick(flags);
      else if (cmd === "read") cmdRead(flags);
      else if (cmd === "end") cmdEnd(flags);
      else if (cmd === "next") cmdNext(flags);
      else if (cmd === "narrate") await cmdNarrate(flags);
      else if (cmd === "list") cmdList();
      else if (cmd === "reap") cmdReap();
      else {
        process.stdout.write("loop-state.mjs -- usage: start|tick|read|end|next|narrate|list|reap\n");
        process.exit(1);
      }
    } catch (e) {
      process.stdout.write(JSON.stringify({ ok: false, error: String(e?.message || e) }) + "\n");
      process.exit(1);
    }
  })();
}
