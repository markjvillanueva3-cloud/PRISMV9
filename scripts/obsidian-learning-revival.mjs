/**
 * obsidian-learning-revival.mjs — no-elevation self-heal ACTUATOR for the
 * Obsidian/Hermes offline context-learning loop.
 *
 * THE GAP THIS CLOSES (lever #4 of OBSIDIAN-HERMES-CONTEXT-LEARNING-ACCEL-2026-06-06).
 * PRISM compounds context offline through a small set of nightly/weekly memory-
 * synthesis engines (the "dream cycle" cross-memo connection discovery + the
 * weekly self-reflect populater). They are driven by Windows scheduled tasks.
 * `fleet-task-health-watch.mjs` already DETECTS when those tasks go
 * Disabled/stale/missing and NAMES the elevated re-install fix — but it
 * explicitly never actuates ("NEVER auto-registers ... It detects + names the
 * fix"). So when the scheduler is dark (observed 2026-06-08: both Hermes
 * learning tasks `Disabled`, dream output frozen at 2026-06-04 → 4 nights of
 * NO offline compounding), the loop stays dark until an operator opens an
 * elevated shell. That is the throttle.
 *
 * THE INSIGHT: the synthesis ENGINES are pure Node `.mjs` (mechanical Jaccard /
 * keyword aggregation, no LLM, <2s) that need NO elevation to run. Reviving the
 * scheduled TASK needs admin; running its ENGINE does not. This actuator runs
 * the engine directly when its task is dark and its output is stale — closing
 * the compounding loop today, every session, without waiting on an elevated
 * operator session. The scheduled-task re-enable is still the durable fix (and
 * the detector still names it); this is the fail-soft floor underneath it.
 *
 * RELATIONSHIP TO EXISTING ASSETS (no duplication — R8):
 *   - fleet-task-health-watch.mjs  — DETECTS dark tasks, NAMES the elevated fix.
 *     This actuator IMPORTS its `sampleScheduledTasks` + `classifyTask` (single
 *     source of truth for task state) and adds the actuation the detector
 *     deliberately omits. It does NOT re-enumerate or re-classify by hand.
 *   - install-hermes-dream-cycle-task.ps1 / install-hermes-self-reflect-task.ps1
 *     — the ELEVATED durable registration. Orthogonal: those register the
 *     scheduler; this runs the engine when the scheduler is dark.
 *   - hermes-dream-cycle-synth.mjs / hermes-self-reflect-populater.mjs — the
 *     engines this invokes. It NEVER reimplements their synthesis logic; it only
 *     decides WHEN to spawn them and verifies the output landed.
 *
 * WHAT IT DELIBERATELY DOES NOT DO:
 *   - It NEVER calls Enable-ScheduledTask / Register-ScheduledTask (needs
 *     elevation; the detector owns naming that fix). No PowerShell mutation.
 *   - It NEVER runs an engine whose output is already fresh for the period
 *     (idempotent: a same-day dream file ⇒ skip; this session and the scheduler
 *     and a peer chat can all fire without double-work or clobber).
 *   - It NEVER fabricates success — a spawned engine that exits nonzero or fails
 *     to land its output file is reported as `failed` (R12 fail-loud).
 *
 * Usage:
 *   node obsidian-learning-revival.mjs              # audit + revive stale, text
 *   node obsidian-learning-revival.mjs --json       # JSON result
 *   node obsidian-learning-revival.mjs --dry-run    # plan only, never spawn
 *   node obsidian-learning-revival.mjs --status     # last telemetry row, no audit
 *   node obsidian-learning-revival.mjs --force      # run engines even if fresh
 *   node obsidian-learning-revival.mjs --help
 *
 * Env knobs (CLI flags win):
 *   PRISM_OBSIDIAN_REVIVAL_DISABLE=1       refuse to spawn/write (audit only)
 *   PRISM_OBSIDIAN_REVIVAL_TIMEOUT_MS=N    per-engine spawn cap (default 180000)
 *   PRISM_OBSIDIAN_REVIVAL_STALE_MULT=N    reuse detector staleness mult (default 3)
 *
 * Exit codes (R12 fail-loud): 0 all-fresh-or-revived · 1 a revival failed ·
 *   2 measurement/IO failure (could not sample tasks).
 *
 * Built 2026-06-08, slot=papa, OBSIDIAN-HERMES-CONTEXT-ACCEL/U-LEARN-REVIVE01.
 * Source: OBSIDIAN-HERMES-CONTEXT-LEARNING-ACCEL-2026-06-06.md lever #4.
 */

import { spawnSync } from "node:child_process";
import {
  appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  sampleScheduledTasks, classifyTask, smallestIntervalMs, DEFAULT_STALE_MULTIPLIER,
} from "./fleet-task-health-watch.mjs";

// ─── Paths & constants ──────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SHARED_DIR = join(REPO_ROOT, "state", "shared");
const TELEMETRY_PATH = join(SHARED_DIR, "obsidian-learning-revival-history.jsonl");
const TELEMETRY_BACKUP = TELEMETRY_PATH + ".1";
const CHAT_BUS_PATH = join(SHARED_DIR, "AGENT_CHAT.jsonl");
const LOG_ROTATE_BYTES = 256 * 1024;

export const DEFAULT_SPAWN_TIMEOUT_MS = 180_000;   // engine cap; heavy-model synth under load CAN exceed this -> classified deferred (benign), not failed

/**
 * The offline context-learning engines this actuator can revive. Each entry is
 * a self-describing learning task:
 *   - taskName:   the Windows scheduled-task name (matched against the live
 *                 enumeration to read its State — the SAME names the detector's
 *                 KNOWN_PRISM_TASKS carries).
 *   - engine:     the pure `.mjs` synthesis engine, relative to REPO_ROOT, run
 *                 directly with node (NO elevation).
 *   - period:     'daily' | 'weekly' — how often a fresh output is expected.
 *   - freshFile:  (nowMs) => absolute path whose existence == "already produced
 *                 this period's output". For daily: today's dated file. For
 *                 weekly: the most-recent ISO-week anchor file. A present+
 *                 non-empty file ⇒ skip (idempotent).
 *
 * SINGLE SOURCE: the taskName strings MUST match the installer -TaskName
 * defaults (install-hermes-dream-cycle-task.ps1 => 'PRISM Hermes Dream-Cycle
 * Synth', install-hermes-self-reflect-task.ps1 => 'PRISM Hermes Self-Reflect
 * Weekly'). They are also in fleet-task-health-watch KNOWN_PRISM_TASKS — a
 * rename there must mirror here, same discipline as the detector.
 */
const MEMORIES_ROOT = join(REPO_ROOT, "knowledge", "memories");

export const LEARNING_ENGINES = [
  {
    key: "dream-cycle",
    taskName: "PRISM Hermes Dream-Cycle Synth",
    engine: join("scripts", "hermes-dream-cycle-synth.mjs"),
    period: "daily",
    freshFile: (nowMs) => join(MEMORIES_ROOT, "dreams", `${isoDate(nowMs)}.md`),
    // Pin the engine to the SAME date the actuator probed (review P2-1): without
    // this, a pass starting at 23:59:59.9xxZ probes day N's freshFile but the
    // engine recomputes its own Date.now() → writes day N+1 → the post-run
    // re-probe of day N finds nothing → false `failed` on a real revival. The
    // synth accepts --date (hermes-dream-cycle-synth.mjs:274). Passing it makes
    // the whole pass referentially transparent w.r.t. the injected nowMs.
    engineArgs: (nowMs) => ["--date", isoDate(nowMs)],
  },
  {
    key: "self-reflect",
    taskName: "PRISM Hermes Self-Reflect Weekly",
    engine: join("scripts", "hermes-self-reflect-populater.mjs"),
    period: "weekly",
    // The populater anchors on the most recent past Sunday; its output file is
    // weekly-hermes-reflection-<anchor>.md at the memories root. "Fresh this
    // week" == a reflection file dated on/after the current ISO-week's Sunday.
    freshFile: (nowMs) => join(MEMORIES_ROOT, `weekly-hermes-reflection-${mostRecentSunday(nowMs)}.md`),
    // Pin the engine to the SAME Sunday anchor the actuator probed (review P2-1).
    // The populater accepts --anchor YYYY-MM-DD (hermes-self-reflect-populater.mjs:212).
    engineArgs: (nowMs) => ["--anchor", mostRecentSunday(nowMs)],
  },
];

// ─── Date helpers (pure) ────────────────────────────────────────────────────

/** UTC YYYY-MM-DD for a ms timestamp. Matches the synth's own dated filename. */
export function isoDate(nowMs) {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/**
 * The most-recent Sunday on/before nowMs, as YYYY-MM-DD (UTC). The self-reflect
 * populater anchors weekly output on a Sunday; "fresh this week" means a file
 * dated this anchor exists. Pure.
 *
 * NOTE: the populater's own --anchor default may differ by hours of local-vs-
 * UTC; this is a conservative freshness probe (if the anchor is off by a day the
 * worst case is one extra harmless re-run, never a missed revival).
 */
export function mostRecentSunday(nowMs) {
  const d = new Date(nowMs);
  // getUTCDay: 0 = Sunday. Subtract that many days to land on this week's Sunday.
  const sunday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - d.getUTCDay()));
  return sunday.toISOString().slice(0, 10);
}

// ─── Pure planning core ─────────────────────────────────────────────────────

/**
 * Decide, for each learning engine, whether to revive (run it now).
 *
 * Decision per engine:
 *   - outputFresh === true                        → skip ("fresh")
 *   - force === true                              → revive ("forced")
 *   - taskStatus is a healthy operational state
 *     ('healthy') AND output is stale             → revive ("task-healthy-but-output-stale")
 *       (the scheduler is alive but the output is behind — e.g. PC was off at
 *        trigger time; running now backfills without waiting for next trigger)
 *   - taskStatus is dark
 *     (disabled | missing | failing | stale |
 *      trigger-stalled | never-ran | unknown-state) → revive ("task-dark")
 *
 * In short: revive whenever the period's output is NOT fresh, regardless of
 * task state — a fresh output is the only skip condition (besides dry intent).
 * The taskStatus is carried purely for the REASON/telemetry (so the operator
 * sees WHY the output was behind), not as a gate. This makes the actuator a
 * pure output-freshness floor: if the compounding artifact for this period is
 * missing, produce it.
 *
 * Pure — no IO. Caller supplies outputFresh + taskStatus.
 *
 * @param {Array<{key,taskName,outputFresh:boolean,taskStatus:string}>} engines
 * @param {{force?:boolean}} [opts]
 * @returns {Array<{key,taskName,revive:boolean,reason:string,taskStatus:string}>}
 */
export function planRevival(engines, opts = {}) {
  const force = !!opts.force;
  const DARK = new Set([
    "disabled", "missing", "failing", "stale", "trigger-stalled",
    "never-ran", "unknown-state",
  ]);
  const out = [];
  for (const e of engines) {
    const status = String(e.taskStatus || "unknown-state");
    if (e.outputFresh && !force) {
      out.push({ key: e.key, taskName: e.taskName, revive: false, reason: "fresh", taskStatus: status });
      continue;
    }
    let reason;
    if (force) reason = "forced";
    else if (DARK.has(status)) reason = `task-dark(${status})`;
    else reason = "task-healthy-but-output-stale";
    out.push({ key: e.key, taskName: e.taskName, revive: true, reason, taskStatus: status });
  }
  return out;
}

// ─── IO: task state, freshness, engine spawn ────────────────────────────────

/**
 * Map the live scheduled-task enumeration to a status string per learning
 * engine, reusing the detector's classifier (single source of truth). A task
 * the enumeration does not return is "missing".
 *
 * @returns {Map<string,string>} taskName → status
 */
export function taskStatusByName(sample, nowMs, staleMultiplier) {
  const byName = new Map();
  const cfg = { staleMultiplier };
  for (const raw of (sample?.tasks || [])) {
    if (!raw || typeof raw !== "object") continue;
    const name = String(raw.name || "").trim();
    if (!name) continue;
    const lastRunTimeMs = raw.lastRunTime ? Date.parse(raw.lastRunTime) : null;
    const nextRunTimeMs = raw.nextRunTime ? Date.parse(raw.nextRunTime) : null;
    const intervalMs = smallestIntervalMs(raw.triggerIntervals);
    const verdict = classifyTask({
      state: raw.state,
      lastRunTimeMs: Number.isFinite(lastRunTimeMs) ? lastRunTimeMs : null,
      nextRunTimeMs: Number.isFinite(nextRunTimeMs) ? nextRunTimeMs : null,
      lastTaskResult: Number.isFinite(raw.lastTaskResult) ? raw.lastTaskResult : null,
      intervalMs,
    }, nowMs, cfg);
    byName.set(name, verdict.status);
  }
  return byName;
}

/** Is the freshness file present and non-empty? (empty ⇒ a prior crashed write) */
function outputIsFresh(absPath, _io = {}) {
  const _stat = _io.statSync || statSync;
  try {
    const st = _stat(absPath);
    return st.isFile() && st.size > 0;
  } catch {
    return false;
  }
}

/**
 * Spawn one synthesis engine directly with node (no elevation). Returns a
 * structured result — never throws (a spawn failure is a `failed` result, R12).
 */
function runEngine(engineRelPath, { timeoutMs, engineArgs = [], _spawn = spawnSync, _exists = existsSync } = {}) {
  const abs = join(REPO_ROOT, engineRelPath);
  if (!_exists(abs)) {
    return { ok: false, status: null, error: `engine script not found: ${engineRelPath}` };
  }
  const res = _spawn(process.execPath, [abs, ...engineArgs], {
    encoding: "utf8", timeout: timeoutMs, cwd: REPO_ROOT, windowsHide: true,
  });
  if (res.error) {
    // A `timeout`-kill (spawnSync sets error.code ETIMEDOUT) is BENIGN+TRANSIENT -- the
    // engine was still RUNNING (heavy-model synthesis under fleet load can exceed the
    // cap), NOT broken. Flag it distinctly so the caller classifies `deferred`, never
    // `failed` -- else SessionStart cries "the loop did not run" on a slow-but-healthy
    // synthesis (a false alarm; R12). Other spawn errors (ENOENT/EACCES) stay failures.
    const timedOut = res.error.code === "ETIMEDOUT";
    return {
      ok: false, status: null, timedOut,
      error: timedOut
        ? `engine timed out after ${timeoutMs}ms (still running under load -- benign, re-run when load clears)`
        : `spawn failed: ${res.error.code || res.error.message}`,
    };
  }
  if (res.status !== 0) {
    return {
      ok: false, status: res.status,
      error: `engine exited ${res.status}: ${(res.stderr || res.stdout || "").trim().slice(0, 300)}`,
    };
  }
  return { ok: true, status: 0, stdout: (res.stdout || "").trim().slice(0, 500) };
}

// ─── Telemetry / chat-bus ───────────────────────────────────────────────────

function rotateIfLarge(path = TELEMETRY_PATH, limit = LOG_ROTATE_BYTES) {
  try {
    const st = statSync(path);
    if (st.size >= limit) renameSync(path, TELEMETRY_BACKUP);
  } catch { /* missing → append creates it */ }
}

/**
 * Append a telemetry row. FULLY best-effort (scrutiny reviewer-C blocker): the
 * ENTIRE write — mkdir + rotate + appendFileSync — is swallowed-with-stderr-warn,
 * never thrown. Telemetry is a non-load-bearing side channel; an EACCES/ENOSPC on
 * the append must NOT propagate out of runOnce and convert an already-successful
 * revival into an exit-2 "measurement failure" (the R12 mislabel-success bug). The
 * worst case of a swallowed append is a lost telemetry row, not a lied-about exit
 * code. Returns true iff the row persisted.
 */
function appendTelemetry(row, path = TELEMETRY_PATH, io = {}) {
  const _mkdir = io.mkdirSync || mkdirSync;
  const _append = io.appendFileSync || appendFileSync;
  try {
    _mkdir(dirname(path), { recursive: true });
    rotateIfLarge(path);
    _append(path, JSON.stringify(row) + "\n", "utf8");
    return true;
  } catch (e) {
    process.stderr.write(`obsidian-learning-revival: telemetry append failed (non-fatal): ${(e?.message || e).toString().slice(0, 160)}\n`);
    return false;
  }
}

/** Append a chat-bus advisory — same fully-best-effort contract as appendTelemetry. */
function appendChatBus(record, path = CHAT_BUS_PATH, io = {}) {
  const _mkdir = io.mkdirSync || mkdirSync;
  const _append = io.appendFileSync || appendFileSync;
  try {
    _mkdir(dirname(path), { recursive: true });
    _append(path, JSON.stringify(record) + "\n", "utf8");
    return true;
  } catch (e) {
    process.stderr.write(`obsidian-learning-revival: chat-bus append failed (non-fatal): ${(e?.message || e).toString().slice(0, 160)}\n`);
    return false;
  }
}

// ─── Orchestration (one pass) ───────────────────────────────────────────────

/**
 * Run one revival pass: sample tasks → classify → check freshness → plan →
 * spawn stale engines → verify output landed → telemetry + advisory.
 *
 * Throws only on a measurement failure (cannot sample tasks) → exit 2. A failed
 * engine revival is a structured `failed` outcome (exit 1), not a throw.
 *
 * @returns {{outcomes:Array, level:'clean'|'revived'|'planned'|'deferred'|'failed', exitCode:number, dryRun:boolean}}
 */
export function runOnce(opts = {}) {
  const disabled = process.env.PRISM_OBSIDIAN_REVIVAL_DISABLE === "1";
  const dryRun = !!opts.dryRun || disabled;
  const force = !!opts.force;
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs
    : Number(process.env.PRISM_OBSIDIAN_REVIVAL_TIMEOUT_MS) || DEFAULT_SPAWN_TIMEOUT_MS;
  const staleMultiplier = Number.isFinite(opts.staleMultiplier) ? opts.staleMultiplier
    : Number(process.env.PRISM_OBSIDIAN_REVIVAL_STALE_MULT) || DEFAULT_STALE_MULTIPLIER;
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const engines = opts.engines || LEARNING_ENGINES;
  const sampler = opts.sampler || sampleScheduledTasks;
  const spawn = opts._spawn || spawnSync;
  const io = opts._io || {};

  // Measurement: sample live task state (may throw → caller maps to exit 2).
  const sample = sampler({ timeoutMs: opts.psTimeoutMs });
  const statusMap = taskStatusByName(sample, nowMs, staleMultiplier);

  // Freshness probe per engine.
  const planInput = engines.map((e) => {
    const freshPath = e.freshFile(nowMs);
    return {
      key: e.key,
      taskName: e.taskName,
      engine: e.engine,
      freshPath,
      // Pin the engine to the SAME anchor used for the freshness probe so the
      // spawned engine writes EXACTLY the path we re-probe (review P2-1). Empty
      // for an engine that declares no engineArgs.
      engineArgs: typeof e.engineArgs === "function" ? e.engineArgs(nowMs) : [],
      outputFresh: outputIsFresh(freshPath, io),
      taskStatus: statusMap.get(e.taskName) || "missing",
    };
  });

  const plan = planRevival(planInput, { force });
  const planByKey = new Map(plan.map((p) => [p.key, p]));

  const outcomes = [];
  for (const e of planInput) {
    const decision = planByKey.get(e.key);
    if (!decision.revive) {
      outcomes.push({ key: e.key, taskName: e.taskName, action: "skip", reason: decision.reason, taskStatus: decision.taskStatus });
      continue;
    }
    if (dryRun) {
      outcomes.push({ key: e.key, taskName: e.taskName, action: "would-revive", reason: decision.reason, taskStatus: decision.taskStatus });
      continue;
    }
    // Actuate: run the engine directly (no elevation), pinned to the probed anchor.
    const ran = runEngine(e.engine, { timeoutMs, engineArgs: e.engineArgs, _spawn: spawn, _exists: io.existsSync });
    // VERIFY the output actually landed — never claim a revival succeeded on a
    // zero exit alone (R12: a green exit with no output file is a silent fail).
    // Re-probe the SAME freshness path computed pre-run (e.freshPath), not a
    // re-derivation — planInput carries freshPath, the fn lives on the engine.
    const landed = ran.ok && outputIsFresh(e.freshPath, io);
    // A timeout-kill is `deferred` (benign -- engine still running under load), NEVER
    // `failed`. Check it FIRST: don't claim a clean revival on a killed process even if
    // a partial output happens to look fresh (R12-conservative -- the next pass verifies).
    const action = ran.timedOut ? "deferred" : (landed ? "revived" : "failed");
    outcomes.push({
      key: e.key,
      taskName: e.taskName,
      action,
      reason: decision.reason,
      taskStatus: decision.taskStatus,
      engineExit: ran.status,
      error: action === "revived" ? undefined : (ran.error || "engine ran but output file did not land"),
    });
  }

  const anyFailed = outcomes.some((o) => o.action === "failed");
  const anyRevived = outcomes.some((o) => o.action === "revived");
  const anyWouldRevive = outcomes.some((o) => o.action === "would-revive");
  const anyDeferred = outcomes.some((o) => o.action === "deferred");
  // Distinct dry-run level (review P1-1): a --dry-run that PLANNED a revival must
  // not report level:"revived" — nothing was revived. "planned" is the honest
  // label (R12: the level field must not lie about dry-run state). A real run
  // never produces would-revive outcomes, so anyWouldRevive ⇒ dryRun.
  // `deferred` (timeout-kill under load) ranks BELOW failed/revived/planned but ABOVE
  // clean: a real failure or revival still dominates, but a lone timeout is benign and
  // must NOT surface as `failed` at SessionStart (buildAdvisory only alarms failed/revived).
  const level = anyFailed ? "failed"
    : anyRevived ? "revived"
    : anyWouldRevive ? "planned"
    : anyDeferred ? "deferred"
    : "clean";

  const ts = new Date(nowMs).toISOString();
  const row = { ts, level, dryRun, outcomes };

  if (!dryRun) {
    // Both appends are fully best-effort (never throw) — a telemetry/chat-bus
    // write failure MUST NOT downgrade an already-successful revival to exit 2
    // (scrutiny reviewer-C blocker). io threads an injectable appendFileSync for
    // the failure-mode test.
    appendTelemetry(row, TELEMETRY_PATH, io);
    // Emit a chat-bus advisory ONLY on a real revival or a failure — a clean
    // pass (everything already fresh) is silent (no noise across 26 chats).
    if (anyRevived || anyFailed) {
      const revived = outcomes.filter((o) => o.action === "revived").map((o) => o.key);
      const failed = outcomes.filter((o) => o.action === "failed").map((o) => `${o.key}(${o.error})`);
      const parts = [];
      if (revived.length) parts.push(`revived ${revived.join(", ")} (engine ran directly — scheduled task was dark)`);
      if (failed.length) parts.push(`FAILED ${failed.join("; ")}`);
      appendChatBus({
        ts,
        from: "obsidian-learning-revival",
        kind: "context-learning-revival",
        level: anyFailed ? "warn" : "info",
        revived, failed: outcomes.filter((o) => o.action === "failed").map((o) => o.key),
        message: `Obsidian/Hermes offline learning: ${parts.join(" · ")}. `
          + `Durable fix (re-enable the dark task, elevated): `
          + `Enable-ScheduledTask -TaskName '<name>' or .claude/helpers/install-hermes-*-task.ps1 -RunNow.`,
      }, CHAT_BUS_PATH, io);
    }
  }

  const exitCode = anyFailed ? 1 : 0;
  return { row, level, outcomes, exitCode, dryRun, timeoutMs, staleMultiplier };
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const HELP = `obsidian-learning-revival.mjs — no-elevation self-heal for the offline context-learning loop.

Runs the Hermes memory-synthesis ENGINES directly when their scheduled tasks are
dark (Disabled/stale/missing) and the period's output is behind. Closes the
compounding loop without an elevated session. The scheduled-task re-enable is
still the durable fix (fleet-task-health-watch names it); this is the floor under it.

Usage:
  node obsidian-learning-revival.mjs            # audit + revive stale, text
  node obsidian-learning-revival.mjs --json     # JSON
  node obsidian-learning-revival.mjs --dry-run  # plan only, never spawn
  node obsidian-learning-revival.mjs --force    # run engines even if fresh
  node obsidian-learning-revival.mjs --status   # last telemetry row, no audit
  node obsidian-learning-revival.mjs --help

Knobs: PRISM_OBSIDIAN_REVIVAL_{DISABLE,TIMEOUT_MS,STALE_MULT}.
Exit: 0 fresh/revived/deferred · 1 a revival failed · 2 measurement failure.
A spawn TIMEOUT under load is a benign 'deferred' (exit 0), never 'failed' (the
scheduled task is the real driver; this no-elevation floor was just too slow).`;

function cmdStatus() {
  if (!existsSync(TELEMETRY_PATH)) return null;
  try {
    const lines = readFileSync(TELEMETRY_PATH, "utf8").trim().split(/\r?\n/).filter(Boolean);
    const last = lines[lines.length - 1];
    return last ? JSON.parse(last) : null;
  } catch { return null; }
}

function fmtSummary(r) {
  const tag = r.level === "failed" ? "[FAIL]" : r.level === "revived" ? "[REVIVED]" : r.level === "deferred" ? "[DEFERRED]" : "[OK]";
  const detail = r.outcomes.map((o) => `${o.key}=${o.action}`).join(", ");
  const dry = r.dryRun ? " [dry-run]" : "";
  return `${tag} obsidian-learning-revival: ${detail}${dry}`;
}

function main() {
  const argv = process.argv.slice(2);
  const a = new Set(argv);
  if (a.has("--help") || a.has("-h")) { console.log(HELP); process.exit(0); }

  if (a.has("--status")) {
    const row = cmdStatus();
    if (a.has("--json")) { console.log(JSON.stringify(row, null, 2)); process.exit(0); }
    if (!row) { console.log("obsidian-learning-revival: no telemetry yet"); process.exit(0); }
    console.log(`obsidian-learning-revival [status] ${row.ts} level=${row.level} `
      + `outcomes=${row.outcomes.map((o) => `${o.key}:${o.action}`).join(",")}`);
    process.exit(0);
  }

  let result;
  try {
    result = runOnce({ dryRun: a.has("--dry-run"), force: a.has("--force") });
  } catch (e) {
    if (a.has("--json")) console.log(JSON.stringify({ ok: false, error: e.message, code: 2 }));
    else console.error(`[FAIL] obsidian-learning-revival: measurement failure — ${e.message}`);
    process.exit(2);
  }
  if (a.has("--json")) console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  else console.log(fmtSummary(result));
  process.exit(result.exitCode);
}

const invokedAsScript = (() => {
  try { return process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]); }
  catch { return false; }
})();
if (invokedAsScript) {
  try { main(); }
  catch (e) { console.error(`[FAIL] obsidian-learning-revival: ${e.message}`); process.exit(2); }
}
