#!/usr/bin/env node
// brain-refresh.mjs — consolidated PRISM-brain refresh orchestrator (OBSIDIAN-BRAIN / BRAIN-REFRESH-MS0)
//
// The 2026-05-30 8-agent brain-upgrade sweep (state/shared/specs/PRISM-BRAIN-UPGRADES-2026-05-30.*)
// found the brain's #1 systemic weakness: FIVE independently-built, tested, working refresh pipelines
// all depend on a HUMAN to run them, so each silently rots between runs. This fans out to all five
// from ONE throttled, health-gated, lock-serialized entry point — the meta-move that consolidates
// inventory ranks 1 / 4 / 5 / 9 / 27 instead of wiring five separate Stop hooks.
//
// SAFETY INVARIANT (load-bearing): the refresh steps WRITE shared sidecars (memory BM25 index,
// dense embeddings, tribal index, system-viz graph). Two concurrent runs = two concurrent writers =
// corrupted sidecar (a brain-wide regression). So a single O_EXCL global lock serializes the fleet:
// at most one brain-refresh runs at a time. Steps run SEQUENTIALLY (never parallel) for the same
// reason. This is the correctness core, not an optimization.
//
// Design: pure core (planSteps / decideThrottle / stepGate / classifyOutcome) + injected-deps
// orchestrate() so a real main()-seam oracle pins lock→throttle→probe→run→stamp ordering.
//
// Exit codes: 0 = ran-clean or benignly-skipped (throttled/locked) · 1 = a step hard-failed ·
//             3 = deferred (Ollama down → generation/embedding steps skipped; benign, re-run later).
//
// Knobs: PRISM_BRAIN_REFRESH_DISABLE=1 · _COOLDOWN_MS=N (default 1800000=30m) · _LOCK_TTL_MS=N
//        (default 1200000=20m stale-reclaim) · OLLAMA_URL · PRISM_ROOT.
// CLI: --dry-run · --force (ignore throttle) · --only id1,id2 · --with-viz (run the heavy regen-viz
//      floor) · --json · --verbose.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = process.env.PRISM_ROOT || "H:/prism";
const SCRIPTS_DIR = path.join(ROOT, "scripts");
const STAMP_FILE = path.join(ROOT, "state/shared/.brain-refresh-stamp.json");
const LOCK_FILE = path.join(ROOT, "state/shared/.brain-refresh.lock");
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

const DEFAULT_COOLDOWN_MS = Number(process.env.PRISM_BRAIN_REFRESH_COOLDOWN_MS) || 30 * 60 * 1000;
const LOCK_TTL_MS = Number(process.env.PRISM_BRAIN_REFRESH_LOCK_TTL_MS) || 20 * 60 * 1000;

// The five refresh pipelines, in dependency order. `requires` gates on Ollama health:
//   'none'       — pure local (no Ollama)
//   'embeddings' — needs /api/embeddings (nomic; stays up even when /api/generate flaps)
//   'generate'   — needs /api/generate (the step self-defends via its own preflight → exit 3)
// `dependsOn` skips the step unless the named prior step succeeded (status 'ok').
// `benignExits` maps a step's NON-zero exit codes that are NOT failures to a status (AMP2 exit 3 =
// Ollama-down deferral; regen-viz exit 4 = another fleet chat holds the system-graph write-lock —
// routine under concurrency — and exit 3 = merge-no-op). Unlisted non-zero exits → 'failed'.
// `heavy` steps run only with --with-viz (they have their own commit/Stop/cron triggers).
export const ALL_STEPS = [
  { id: "mem-index", label: "memory BM25 index sidecar", script: "build-memory-index-sidecar.mjs", args: [], requires: "none", dependsOn: null, timeoutMs: 180_000 },
  { id: "mem-embed", label: "memory dense embeddings sidecar", script: "build-memory-embeddings-sidecar.mjs", args: ["--resume"], requires: "embeddings", dependsOn: "mem-index", timeoutMs: 600_000 },
  { id: "galaxy-synth", label: "AMP2 galaxy synthesis refresh (+cascade)", script: "galaxy-synthesis-refresh.mjs", args: [], requires: "generate", dependsOn: null, timeoutMs: 1_200_000, benignExits: { 3: "deferred" } },
  { id: "wiki-tribal", label: "wiki→tribal embed", script: "embed-all-wiki.mjs", args: ["--apply"], requires: "embeddings", dependsOn: null, timeoutMs: 1_800_000 },
  { id: "regen-viz", label: "system-viz regen floor", script: "regen-viz.mjs", args: [], requires: "none", dependsOn: null, timeoutMs: 1_800_000, heavy: true, benignExits: { 4: "skipped-locked", 3: "deferred" } },
];

// ───────────────────────── pure core (unit-testable, no I/O) ─────────────────────────

/** Filter the step table by --only and the --with-viz heavy gate; preserves order. */
export function planSteps({ allSteps = ALL_STEPS, only = null, withHeavy = false } = {}) {
  const onlySet = Array.isArray(only) && only.length ? new Set(only) : null;
  return allSteps.filter((s) => {
    if (onlySet && !onlySet.has(s.id)) return false;
    if (s.heavy && !withHeavy) return false;
    return true;
  });
}

/** Throttle decision: run only if forced, never-run, or cooldown elapsed. */
export function decideThrottle({ lastStampMs, now, cooldownMs = DEFAULT_COOLDOWN_MS, force = false }) {
  if (force) return { run: true, reason: "forced" };
  if (lastStampMs == null || !Number.isFinite(lastStampMs)) return { run: true, reason: "never-run" };
  const age = now - lastStampMs;
  if (age >= cooldownMs) return { run: true, reason: `cooldown-elapsed(${Math.round(age / 1000)}s)` };
  return { run: false, reason: `throttled(${Math.round((cooldownMs - age) / 1000)}s-left)` };
}

/**
 * Decide whether a single step runs, given Ollama health and prior-step results.
 * Returns { run } or { run:false, skipStatus }. priorResults = { [stepId]: status }.
 */
export function stepGate({ step, health, priorResults = {} }) {
  if (step.requires === "generate" && !health.generate) return { run: false, skipStatus: "deferred-ollama" };
  if (step.requires === "embeddings" && !health.embeddings) return { run: false, skipStatus: "deferred-ollama" };
  if (step.dependsOn) {
    const depStatus = priorResults[step.dependsOn];
    if (depStatus !== "ok") return { run: false, skipStatus: "skipped-dep" };
  }
  return { run: true };
}

/** Map a step's run result to a status, honoring its benignExits map. */
export function statusFromRun(step, r) {
  if (!r || r.err === "ENOENT" || r.missing) return "missing";
  if (r.exit === 0) return "ok";
  const benign = step.benignExits && step.benignExits[r.exit];
  if (benign) return benign;
  return "failed";
}

/** Aggregate per-step statuses into an exit code. failed→1, else deferred→3, else 0. */
export function classifyOutcome(results) {
  const any = (...sts) => results.some((r) => sts.includes(r.status));
  if (any("failed", "missing")) return { exitCode: 1, verdict: "failed" };
  if (any("deferred", "deferred-ollama")) return { exitCode: 3, verdict: "deferred" };
  return { exitCode: 0, verdict: "ok" };
}

// ───────────────────────── orchestrators (injected deps) ─────────────────────────

/**
 * Run the (already-planned) steps SEQUENTIALLY, gating each on health + dependencies.
 * deps: { runStep(step)->{exit,ms,err?,missing?}, log(msg) }.
 * Returns { results:[{id,label,status,...}], ...classifyOutcome }.
 */
export function executeRefresh({ steps, health, runStep, log = () => {} }) {
  const results = [];
  const priorResults = {};
  for (const step of steps) {
    const gate = stepGate({ step, health, priorResults });
    if (!gate.run) {
      log(`  ↳ ${step.id}: ${gate.skipStatus}`);
      const rec = { id: step.id, label: step.label, status: gate.skipStatus };
      results.push(rec);
      priorResults[step.id] = gate.skipStatus;
      continue;
    }
    const r = runStep(step) || {};
    const status = statusFromRun(step, r);
    log(`  ↳ ${step.id}: ${status}${r.ms != null ? ` (${Math.round(r.ms / 1000)}s)` : ""}`);
    results.push({ id: step.id, label: step.label, status, exit: r.exit, ms: r.ms, err: r.err });
    priorResults[step.id] = status;
  }
  return { results, ...classifyOutcome(results) };
}

/**
 * Top-level orchestration: throttle → lock → probe → run → stamp. Lock is ALWAYS released.
 * deps: { readStamp()->ms|null, writeStamp(now), acquireLock()->bool, releaseLock(),
 *         probeOllama()->{generate,embeddings,daemon}, runStep, log }.
 */
export function orchestrate({ now, cooldownMs = DEFAULT_COOLDOWN_MS, force = false, only = null, withHeavy = false, allSteps = ALL_STEPS, deps }) {
  const { readStamp, writeStamp, acquireLock, releaseLock, probeOllama, runStep, log = () => {} } = deps;

  const throttle = decideThrottle({ lastStampMs: readStamp(), now, cooldownMs, force });
  if (!throttle.run) return { action: "skipped-throttle", reason: throttle.reason, exitCode: 0, results: [] };

  if (!acquireLock()) return { action: "skipped-locked", reason: "another brain-refresh holds the lock", exitCode: 0, results: [] };

  try {
    const health = probeOllama();
    log(`ollama: daemon=${health.daemon} generate=${health.generate} embeddings=${health.embeddings}`);
    const steps = planSteps({ allSteps, only, withHeavy });
    const res = executeRefresh({ steps, health, runStep, log });
    writeStamp(now); // stamp AFTER the run so a crash mid-run doesn't suppress the next attempt
    return { action: "ran", health, ...res };
  } finally {
    releaseLock();
  }
}

// ───────────────────────── real I/O deps (only used by main) ─────────────────────────

function realReadStamp() {
  try {
    const j = JSON.parse(fs.readFileSync(STAMP_FILE, "utf8"));
    return Number.isFinite(j.ts) ? j.ts : null;
  } catch {
    return null; // absent/corrupt → treat as never-run (fail-open on throttle)
  }
}

function realWriteStamp(now) {
  try {
    const tmp = `${STAMP_FILE}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify({ ts: now, iso: new Date(now).toISOString(), pid: process.pid }));
    fs.renameSync(tmp, STAMP_FILE);
  } catch (e) {
    process.stderr.write(`[brain-refresh] stamp write failed (non-fatal): ${e.message}\n`);
  }
}

export function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM"; // exists but not ours
  }
}

/**
 * Acquire an O_EXCL lock at `lockPath`. Parameterized + EXPORTED so the load-bearing single-writer
 * invariant has a real-fs regression oracle (inject ttlMs / isAlive / now for deterministic
 * stale-vs-live + TTL-expiry tests). Returns true iff this process now holds the lock.
 */
export function acquireLockAt(lockPath, { ttlMs = LOCK_TTL_MS, isAlive = pidAlive, now = Date.now() } = {}, _retried = false) {
  try {
    const fd = fs.openSync(lockPath, "wx"); // O_EXCL — fails if held
    fs.writeSync(fd, JSON.stringify({ pid: process.pid, ts: now }));
    fs.closeSync(fd);
    return true;
  } catch (e) {
    if (e.code !== "EEXIST") {
      process.stderr.write(`[brain-refresh] lock error (refusing to run): ${e.message}\n`);
      return false;
    }
    if (_retried) return false;
    // Held — reclaim only if the holder is stale (dead PID) OR older than the TTL.
    let holder = null;
    let corrupt = false;
    let raw = "";
    try {
      raw = fs.readFileSync(lockPath, "utf8");
      holder = JSON.parse(raw);
    } catch {
      // U-OBS-BRAIN-LOCK-RECLAIM (2026-06-09, slot:alpha): an unparseable/corrupt
      // lock is BY DEFINITION not a live holder (a real holder writes valid
      // {pid,ts} JSON). The old `return false` here ("conservative, don't run")
      // FROZE the dense recall arm for 27h+ on a 32-NUL-byte lock -- dense sidecar
      // stuck while BM25 advanced, a silent fail-loud violation of a PSN leg.
      //
      // BUT distinguish EMPTY from non-empty-garbage (P2, scrutiny B+C): a 0-byte
      // read can be a peer's lock observed in the microsecond window between its
      // openSync("wx") (creates an empty entry) and its writeSync(JSON) -- that
      // peer IS a live holder mid-creation, so an empty read must DEFER (the old
      // conservative behavior), not reclaim, else we steal a just-created lock and
      // break the single-writer invariant. Non-empty-but-unparseable (the 32-NUL
      // live incident, or any garbage body) is genuine corruption -> reclaim. A
      // single small writeSync makes a partial NON-empty body unreachable, so
      // "empty vs non-empty" is the exact, safe boundary.
      if (raw.length === 0) return false; // mid-creation by a live peer -> defer
      corrupt = true;
      process.stderr.write(`[brain-refresh] corrupt/unparseable lock at ${lockPath} (${raw.length}B) -- reclaiming (not a live holder)\n`);
    }
    const age = now - (Number(holder?.ts) || 0);
    const stale = corrupt || !isAlive(holder?.pid) || age > ttlMs;
    if (!stale) return false; // a live, recent run owns it
    // Race-safe reclaim: atomically RENAME the stale lock aside (NOT unlink+recreate, which
    // races — two processes could both unlink and one clobber the other's fresh lock, breaking
    // the single-writer invariant). Only ONE racer wins the rename; the loser's rename throws
    // ENOENT → it defers. The winner cleans the aside and re-creates a fresh lock via O_EXCL.
    const aside = `${lockPath}.stale.${process.pid}.${now}`;
    try {
      fs.renameSync(lockPath, aside);
    } catch {
      return false; // lost the reclaim race — someone else already moved it
    }
    try {
      fs.unlinkSync(aside);
    } catch {
      /* aside cleanup best-effort */
    }
    return acquireLockAt(lockPath, { ttlMs, isAlive, now }, true); // one retry after winning the reclaim
  }
}

/** Release the lock at `lockPath` — only if WE hold it (pid match). Exported for the oracle. */
export function releaseLockAt(lockPath) {
  try {
    const holder = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    if (holder?.pid === process.pid) fs.unlinkSync(lockPath); // only unlink our own
  } catch {
    /* already gone / not ours */
  }
}

const realAcquireLock = () => acquireLockAt(LOCK_FILE);
const realReleaseLock = () => releaseLockAt(LOCK_FILE);

function curlOk(args, timeoutMs) {
  try {
    const out = execFileSync("curl", args, { timeout: timeoutMs, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return { ok: true, out };
  } catch {
    return { ok: false, out: "" };
  }
}

function realProbeOllama() {
  // /api/tags = daemon liveness (cheap). NOTE: we do NOT probe /api/generate — it can hang under
  // contention (the fleet's documented failure mode); the generate step (AMP2) self-defends via its
  // own 180s preflight and returns exit 3 if generation is down. So generate-health := daemon-up.
  const daemon = curlOk(["-s", "-m", "3", `${OLLAMA_URL}/api/tags`], 5000).ok;
  let embeddings = false;
  if (daemon) {
    const r = curlOk(["-s", "-m", "8", "-X", "POST", `${OLLAMA_URL}/api/embeddings`, "-H", "Content-Type: application/json", "-d", '{"model":"nomic-embed-text","prompt":"ping"}'], 10000);
    embeddings = r.ok && r.out.includes("embedding");
  }
  return { daemon, generate: daemon, embeddings };
}

function realRunStep(step) {
  const scriptPath = path.join(SCRIPTS_DIR, step.script);
  if (!fs.existsSync(scriptPath)) return { exit: null, ms: 0, err: "ENOENT", missing: true };
  const t0 = Date.now();
  try {
    execFileSync(process.execPath, [scriptPath, ...step.args], { cwd: ROOT, timeout: step.timeoutMs, stdio: ["ignore", "ignore", "pipe"], encoding: "utf8" });
    return { exit: 0, ms: Date.now() - t0 };
  } catch (e) {
    // execFileSync throws on nonzero exit OR timeout/signal; surface the real exit code when present.
    const exit = typeof e.status === "number" ? e.status : (e.signal ? 124 : 1);
    return { exit, ms: Date.now() - t0, err: e.signal ? `signal:${e.signal}` : (e.code || "nonzero-exit") };
  }
}

export function parseArgs(argv) {
  const a = { dryRun: false, force: false, only: null, withHeavy: false, json: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--dry-run") a.dryRun = true;
    else if (t === "--force") a.force = true;
    else if (t === "--with-viz" || t === "--heavy") a.withHeavy = true;
    else if (t === "--json") a.json = true;
    else if (t === "--verbose") a.verbose = true;
    else if (t === "--only") a.only = (argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
  }
  return a;
}

// ───────────────────────── main ─────────────────────────

/** Validate --only ids against the step table. { ok, unknown, reason? }. null only = no filter. */
export function validateOnly(only, allSteps = ALL_STEPS) {
  if (only == null) return { ok: true, unknown: [] };
  if (!Array.isArray(only) || only.length === 0) return { ok: false, unknown: [], reason: "empty" };
  const known = new Set(allSteps.map((s) => s.id));
  const unknown = only.filter((id) => !known.has(id));
  return { ok: unknown.length === 0, unknown };
}

function main() {
  if (process.env.PRISM_BRAIN_REFRESH_DISABLE === "1") {
    process.stderr.write("[brain-refresh] disabled via PRISM_BRAIN_REFRESH_DISABLE=1\n");
    process.exit(0);
  }
  const args = parseArgs(process.argv.slice(2));
  const log = args.verbose ? (m) => process.stderr.write(`[brain-refresh] ${m}\n`) : () => {};

  // Fail loud on --only footguns: bare --only (no value) or unknown step ids (silent no-op otherwise).
  if (args.only) {
    const v = validateOnly(args.only);
    if (!v.ok) {
      const msg = v.reason === "empty" ? "--only requires comma-separated step ids" : `--only unknown ids: ${v.unknown.join(",")}`;
      process.stderr.write(`[brain-refresh] ${msg}; valid: ${ALL_STEPS.map((s) => s.id).join(",")}\n`);
      process.exit(2);
    }
  }

  if (args.dryRun) {
    const steps = planSteps({ only: args.only, withHeavy: args.withHeavy });
    const health = realProbeOllama();
    // Forward-simulate the sequential dependency chain so willRun reflects a real run
    // (a dependsOn step shows willRun:true once its prerequisite would succeed, not false
    // against an empty prior-results map).
    const sim = {};
    const plannedSteps = steps.map((s) => {
      const gate = stepGate({ step: s, health, priorResults: sim });
      sim[s.id] = gate.run ? "ok" : gate.skipStatus;
      return { id: s.id, requires: s.requires, willRun: gate.run, ...(gate.run ? {} : { skip: gate.skipStatus }) };
    });
    process.stdout.write(JSON.stringify({ dryRun: true, health, plannedSteps }, null, args.json ? 0 : 2) + "\n");
    process.exit(0);
  }

  const now = Date.now();
  const result = orchestrate({
    now,
    force: args.force,
    only: args.only,
    withHeavy: args.withHeavy,
    deps: { readStamp: realReadStamp, writeStamp: realWriteStamp, acquireLock: realAcquireLock, releaseLock: realReleaseLock, probeOllama: realProbeOllama, runStep: realRunStep, log },
  });

  if (args.json) {
    process.stdout.write(JSON.stringify(result) + "\n");
  } else {
    process.stdout.write(`[brain-refresh] action=${result.action} verdict=${result.verdict ?? "-"} exit=${result.exitCode}\n`);
    for (const r of result.results || []) process.stdout.write(`  - ${r.id}: ${r.status}${r.ms != null ? ` (${Math.round(r.ms / 1000)}s)` : ""}\n`);
  }
  process.exit(result.exitCode);
}

// ESM entry-point guard. NOTE: compare file URLs via pathToFileURL — NOT
// path.resolve(new URL(import.meta.url).pathname), which on Windows yields a
// leading-slash "/H:/..." that path.resolve mangles, making isMain falsely
// false (main() silently never runs). See BRAIN-REFRESH-MS0 live-smoke catch.
const isMain = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1] || "").href;
  } catch {
    return false;
  }
})();
if (isMain) main();
