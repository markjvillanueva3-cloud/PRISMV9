#!/usr/bin/env node
/**
 * consensus-queue-drain.mjs — drain the auto-fire consensus queue.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-AUTO-FIRE.
 *
 * The hooks `auto-consensus-userprompt.mjs` and `auto-consensus-critical-edit.mjs`
 * both ENQUEUE pending consensus tasks instead of running consensus
 * inline (because consensus is 30-60s — too slow for any critical-path hook).
 *
 * This script drains the queue. Invoke it:
 *   - Manually: `node .claude/scripts/consensus-queue-drain.mjs`
 *   - On Stop hook (idle moment, won't block the user)
 *   - On a periodic cron / chokidar watcher
 *   - --max=N to limit runs per invocation (default 3 per drain)
 *   - --once to drain a single entry then exit
 *
 * Each entry calls `multiModelConsensusEngine.ask()` via the compiled engine
 * in `mcp-server/dist/`. Failure to load means MCP isn't built — the script
 * exits 0 with a warning so it never breaks Stop hook.
 *
 * After processing, the entry is moved from queue.jsonl to a sibling
 * `consensus-queue-processed.jsonl` so we have an audit trail.
 *
 * @module scripts/consensus-queue-drain
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { acquireExclusiveLock, releaseExclusiveLock } from "../../scripts/lib/exclusive-file-lock.mjs";

const QUEUE_PATH = process.env.PRISM_CONSENSUS_QUEUE ?? "H:/prism/state/shared/consensus-queue.jsonl";
const PROCESSED_PATH = QUEUE_PATH.replace(/\.jsonl$/, "-processed.jsonl");
// Single fleet-wide lock for the queue read-modify-write critical section. Derived
// from QUEUE_PATH so a custom queue (env/test) gets its OWN lock (test isolation).
const QUEUE_LOCK_PATH = `${QUEUE_PATH}.drain.lock`;
// PROCESS-LEVEL overlap lock (distinct from the per-ENTRY QUEUE_LOCK_PATH): the drain fires on
// EVERY Stop hook across all 26 slots, so without this up to 26 drain PROCESSES would each
// loadConsensusEngine() + run consensus in PARALLEL -> 26 concurrent Ollama calls thundering one
// GPU. Held for the WHOLE drain; a concurrent drain SKIPS this Stop (the queue is durable, it
// drains on a later one). Resource-protection, NOT fleet-control.
const DRAIN_PROCESS_LOCK_PATH = `${QUEUE_PATH}.drain-process.lock`;
// Stale headroom is DERIVED from maxPerDrain at acquire time (see acquireDrainProcessLock) so a
// legitimately-slow drain is never stolen as stale -> two parallel drains -> the 26x-herd. This
// is the FLOOR (env-overridable); the effective staleMs = max(floor, maxPerDrain * worst * 1.5).
const DRAIN_PROCESS_STALE_FLOOR_MS = Number(process.env.PRISM_CONSENSUS_DRAIN_PROCESS_STALE_MS) || 300_000;
const DRAIN_PER_ENTRY_WORST_MS = 90_000; // matches the per-entry Ollama ask() timeout
const DEFAULT_MAX_PER_DRAIN = 3;

// RATE-LIMIT-FIX (slot:bravo, 2026-06-09). The auto-consensus hook queues EVERY prompt across
// the ~10-session fleet; the drain fans each out via engine.ask(). With the engine DEFAULTS
// (includeClaude:true + the always-on codex voice) every drained entry made a real Claude/Codex
// API call -> across the fleet that is a hidden amplifier of the exact org-wide rate limit this
// session diagnosed (see reference_ollama_fanout_ratelimit_fix_2026_06_09). So the drain now runs
// LOCAL-ONLY by default: gpt-oss:120b + qwen2.5-coder:32b (two strong resident voices = genuine
// multi-model consensus, $0, NO Anthropic limit). Set PRISM_CONSENSUS_DRAIN_INCLUDE_CLAUDE=1 to
// restore Claude/Codex-inclusive consensus when rate limits are not a concern (R7: safe default,
// richer path opt-in). The local panel mirrors octopus-first-live-record's voice bound.
const DRAIN_INCLUDE_CLAUDE = process.env.PRISM_CONSENSUS_DRAIN_INCLUDE_CLAUDE === "1";
// OCTOPUS-HERMES-SYNERGY (slot:zulu, 2026-06-23): opt-in to add the FREE hermes-Grok voice (the
// :8645 OAuth proxy -- same Grok model via the operator's managed credential, $0) to the otherwise
// local-only drain. DEFAULT OFF (byte-identical to the deliberate local-only design -- R7). When
// ON it is KEYLESS-GATED below so the unattended fleet-wide drain can NEVER make a PAID Grok call
// (the no-paid-voice invariant that includeClaude:false / includeCodex:false also enforce) -- only
// the free proxy. Fail-soft: the engine gate ANDs includeGrok with backend reachability, so a down
// proxy => no Grok voice => exactly the current 2-voice behavior (graceful, no drain breakage).
const DRAIN_HERMES_GROK = process.env.PRISM_CONSENSUS_DRAIN_HERMES_GROK === "1";
// CO-RESIDENCY-CORRECT panel (live-validation R15 finding 2026-06-09): the drain fires on every
// Stop, so its two voices must CO-RESIDE in VRAM for a fast genuine 2-voice consensus. gpt-oss:120b
// (65GB) + qwen2.5-coder:32b (37GB) = 102GB > 96GB -> can't co-reside -> resolveDiverseOllamaPanel
// drops the 120b -> SINGLE voter (proven: a batch drain recorded voters=[qwen2.5-coder:32b] only).
// qwen2.5-coder:32b (37GB, code specialist) + gpt-oss:20b (13GB, general reasoner) = 50GB < 96GB:
// both resident, both diverse families -> a real fast 2-voice consensus. Override via
// PRISM_CONSENSUS_DRAIN_PANEL="modelA,modelB". (The 120b stays the octopus deep-reasoning voice.)
const DRAIN_LOCAL_PANEL = (process.env.PRISM_CONSENSUS_DRAIN_PANEL
  ? process.env.PRISM_CONSENSUS_DRAIN_PANEL.split(",").map((s) => s.trim()).filter(Boolean)
  : ["qwen2.5-coder:32b", "gpt-oss:20b"]);

// PURE: should the local-only drain seat the FREE hermes-Grok voice? Only when the operator
// opted in (knobOn) AND the host is keyless -- so the unattended drain NEVER makes a paid Grok
// API call (the no-paid-voice invariant). The engine's includeGrok gate still ANDs this with live
// proxy reachability, so a down proxy degrades to the current 2-voice behavior. (OCTOPUS-HERMES-
// SYNERGY / U-OCT-DRAIN-HERMES-GROK, 2026-06-23 slot:zulu.)
export function drainGrokEnabled(knobOn, env = process.env) {
  return Boolean(knobOn) && !env.XAI_API_KEY && !env.GROK_API_KEY;
}

// Build the voice bound for engine.ask(). Local-only unless explicitly opted into Claude/Codex.
export function buildDrainVoiceBound() {
  if (DRAIN_INCLUDE_CLAUDE) return {}; // engine defaults: Claude + Codex + Ollama (richer, costs API)
  return {
    includeClaude: false,
    // includeCodex:false CLEANLY drops the codex voice. Without it the engine
    // called codex UNCONDITIONALLY, so this "local-only" drain still spawned the
    // codex CLI on every drained entry across the fleet -- real ChatGPT spend on
    // any host with codex installed (the exact rate-limit amplifier this drain
    // claims to eliminate), or a phantom failed:spawn-enoent voice where it isn't.
    includeCodex: false,
    // FREE hermes-Grok voice only when opted in (PRISM_CONSENSUS_DRAIN_HERMES_GROK=1) AND keyless
    // (drainGrokEnabled) -- so the unattended drain never makes a PAID Grok API call (only the free
    // :8645 OAuth proxy). Default OFF / keyed host => false => byte-identical local-only behavior.
    includeGrok: drainGrokEnabled(DRAIN_HERMES_GROK),
    includeGemini: false,
    // diverseLocalPanel routes the panel through ollamaCapabilityProbeEngine, which
    // seats only the models RUNNABLE right now (present + fit free VRAM + runsOn host).
    // forceProbe:true bypasses the probe's 5-MIN CACHE -- the load-bearing fix for the
    // single-voter bug. ROOT CAUSE (verified live 2026-06-17, slot:bravo): the drain was
    // reading a STALE probe snapshot taken during fleet GPU contention (when gpt-oss:20b
    // did not fit) -> it dropped gpt-oss:20b even AFTER the GPU went idle -> a permanent
    // voters=[qwen2.5-coder:32b] single-voter "consensus" (agreement ~0). With a FRESH
    // probe each drain: on an IDLE GPU both seat -> real 2-voice consensus (live: both
    // ok=true); under genuine contention the fresh probe correctly drops the unloadable
    // 2nd voice -> fast 1-voice graceful (NOT the dual-pin's wasted 90s timeout, which was
    // the disproven fix). So the panel ADAPTS to current GPU state instead of a stale snapshot.
    // The probe call is cheap (~ms /api/tags+VRAM); negligible per-drain overhead.
    diverseLocalPanel: true,
    diverseLocalModels: DRAIN_LOCAL_PANEL,
    forceProbe: true,
  };
}

const args = process.argv.slice(2);
const maxArg = args.find((a) => a.startsWith("--max="));
// Validate --max: a non-numeric / <1 value would otherwise make the drain loop
// condition (drained < maxPerDrain) false from the start → silently drains zero
// items with no error. Fall back to the default (or 1 for --once) on bad input.
const maxParsed = maxArg ? Number(maxArg.split("=")[1]) : NaN;
const maxPerDrain = (Number.isFinite(maxParsed) && maxParsed >= 1)
  ? Math.floor(maxParsed)
  : (args.includes("--once") ? 1 : DEFAULT_MAX_PER_DRAIN);
const verbose = args.includes("--verbose");

function log(msg) {
  if (verbose) process.stderr.write(`[consensus-drain] ${msg}\n`);
}

function readQueue() {
  if (!fs.existsSync(QUEUE_PATH)) return [];
  const raw = fs.readFileSync(QUEUE_PATH, "utf-8");
  return raw.split("\n")
    .filter((l) => l.length > 0)
    .map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    })
    .filter((e) => e !== null);
}

function writeQueue(entries) {
  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
  const text = entries.length === 0 ? "" : entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
  // ATOMIC write: temp + rename so a kill mid-write never leaves a torn queue file.
  // writeQueue now fires once PER claimed entry inside the short lock (higher write
  // frequency than the old batch-at-end write), so the torn-write window matters more.
  // renameSync is atomic on the same filesystem (POSIX); the pid-scoped temp name avoids any
  // collision (the lock already serializes drain writers, this hardens the kill-mid-write case).
  // win32 caveat: this lock serializes drain-vs-drain only -- the producer enqueue hooks
  // (auto-consensus-userprompt/critical-edit) append to QUEUE_PATH UNLOCKED, so if a producer
  // holds the file open for append at this instant, MoveFileEx can throw EPERM/EACCES (caught at
  // main().catch -> benign retry next Stop, queue untouched). Closing the drain-vs-producer gap
  // (producers acquiring QUEUE_LOCK_PATH) is the deferred follow-up; see the wiki lesson.
  const tmp = `${QUEUE_PATH}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, text, "utf-8");
  fs.renameSync(tmp, QUEUE_PATH);
}

function appendProcessed(entry, result, errorMsg) {
  fs.mkdirSync(path.dirname(PROCESSED_PATH), { recursive: true });
  const audit = {
    ...entry,
    drained_at: new Date().toISOString(),
    drain_ok: result !== null,
    drain_error: errorMsg ?? null,
    consensus_recommendation: result?.recommendation ?? null,
    consensus_agreement: result?.agreementScore ?? null,
    consensus_voters: result?.consensus?.voters ?? null,
    // Total models that actually ANSWERED (ok) -- distinct from `voters`, which is the
    // WINNING-cluster subset. This lets the ledger tell a real 2-voice DISAGREEMENT
    // (>=2 participants + low agreement -> escalate, the HEALTHY case) apart from the
    // single-voter STALE-PROBE bug (1 participant). With forceProbe + an idle GPU this
    // is >=2; under genuine contention the fresh probe gracefully seats 1. (slot:bravo 2026-06-17)
    consensus_participants: (() => {
      const resp = result?.consensus?.responses ?? result?.responses ?? [];
      return Array.isArray(resp) ? resp.filter((r) => r && r.ok).map((r) => r.model) : null;
    })(),
  };
  fs.appendFileSync(PROCESSED_PATH, JSON.stringify(audit) + "\n", "utf-8");
}

async function loadConsensusEngine() {
  // Try iooms0 dist first, then main, then bare H: dist.
  const candidates = [
    "H:/prism-iooms0/mcp-server/dist/engines/MultiModelConsensusEngine.js",
    "H:/prism/mcp-server/dist/engines/MultiModelConsensusEngine.js",
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const mod = await import(pathToFileURL(candidate).href);
        if (mod && (mod.multiModelConsensusEngine || mod.MultiModelConsensusEngine)) {
          log(`loaded engine from ${candidate}`);
          return mod.multiModelConsensusEngine ?? new mod.MultiModelConsensusEngine();
        }
      } catch (e) {
        log(`load failed ${candidate}: ${e?.message}`);
      }
    }
  }
  return null;
}

async function processEntry(engine, entry) {
  log(`processing ${entry.prompt_hash?.slice(0, 8) ?? "?"} (${entry.task_type})`);
  try {
    const result = await engine.ask({
      prompt: entry.prompt,
      taskType: entry.task_type ?? "auto",
      sourceSession: entry.session_id,
      timeoutMs: 90_000,
      persist: true,
      ...buildDrainVoiceBound(), // local-only by default (no Claude/Codex API spend) -- rate-limit-fix
    });
    return { result, errorMsg: null };
  } catch (e) {
    return { result: null, errorMsg: e?.message ?? String(e) };
  }
}

// Atomically claim (and REMOVE) the next queue entry under the SHORT exclusive
// lock, then process it OUTSIDE the lock. Reuses exclusive-file-lock.mjs (the
// canonical O_EXCL + stale-steal primitive). Only readQueue/shift/writeQueue is
// inside the lock (sub-second), per that module's hold-duration contract: the
// slow ~90s engine.ask() happens lock-free in the caller.
//
// WHY (the race this kills): the prior main() read the WHOLE queue, processed
// maxPerDrain entries, then writeQueue(remaining) ONCE at the end. With NO lock
// and the drain firing on EVERY chat's Stop across the 26-slot fleet, two
// concurrent drains each read the full queue and each overwrite it with their own
// stale "remaining" -- entries resurrected (re-processed) or lost + duplicate
// Ollama consensus spend. The per-entry claim serializes every drain fleet-wide.
//
// SEMANTICS -- claim-by-remove == AT-MOST-ONCE: a crash/external-kill AFTER claim
// but BEFORE appendProcessed loses that ONE in-flight entry. Deliberate trade vs
// the prior at-least-once-WITH-RACE: for an ADVISORY consensus-enrichment queue
// the auto-consensus hooks continuously re-enqueue, so a rare lost in-flight entry
// self-heals, and a serialized no-double-spend claim is the correct R7 choice.
// Returns { entry, locked }: entry=null with locked=false -> queue empty; entry=null
// with locked=true -> a live peer held the lock through the retry window (just stop;
// entries persist for the next drain). (R12: surfaced, not hidden.)
function claimNextEntry() {
  const lk = acquireExclusiveLock(QUEUE_LOCK_PATH, { staleMs: 30_000 });
  if (!lk.acquired) return { entry: null, locked: true };
  try {
    const queue = readQueue();
    if (queue.length === 0) return { entry: null, locked: false };
    const entry = queue.shift();
    writeQueue(queue); // short critical section: read -> shift -> write (sub-second)
    return { entry, locked: false };
  } finally {
    releaseExclusiveLock(QUEUE_LOCK_PATH);
  }
}

// Single-attempt process-lock acquire (retries:1) so a concurrent drain SKIPS immediately
// rather than waiting out the default ~2.5s retry window -- the loser drains on a later Stop.
// Exported (with an injectable path) for hermetic concurrency tests.
export function acquireDrainProcessLock(lockPath = DRAIN_PROCESS_LOCK_PATH) {
  // staleMs must exceed the worst-case serial hold (maxPerDrain entries x the per-entry Ollama
  // timeout) + 50% margin, else a slow-but-ALIVE drain gets its lock stolen -> two parallel
  // drains -> the exact herd this lock prevents (P2, 3-of-3). Floored at the env/5-min default.
  const staleMs = Math.max(DRAIN_PROCESS_STALE_FLOOR_MS, Math.ceil(maxPerDrain * DRAIN_PER_ENTRY_WORST_MS * 1.5));
  return acquireExclusiveLock(lockPath, { retries: 1, retryMs: 1, staleMs });
}
export function releaseDrainProcessLock(lockPath = DRAIN_PROCESS_LOCK_PATH) {
  releaseExclusiveLock(lockPath);
}

async function main() {
  // Lock-free peek only to short-circuit the engine load on an empty queue.
  if (readQueue().length === 0) {
    log("queue empty");
    process.stdout.write(JSON.stringify({ drained: 0, remaining: 0 }) + "\n");
    return;
  }

  // PROCESS-LEVEL overlap lock: only ONE drain runs at a time fleet-wide. A concurrent drain
  // (another slot's Stop) SKIPS this Stop instead of spinning up a parallel engine + Ollama
  // call -- the queue is durable, so the loser drains on a later Stop. Distinct from the
  // per-entry claimNextEntry lock (which only serializes individual claims, not whole drains).
  const plk = acquireDrainProcessLock();
  if (!plk.acquired) {
    log("another drain holds the process lock; skipping this Stop (queue is durable)");
    process.stdout.write(JSON.stringify({ drained: 0, remaining: readQueue().length, skipped: "process-locked" }) + "\n");
    return;
  }

  try {
    log(`queue has entries; will process up to ${maxPerDrain}`);

    const engine = await loadConsensusEngine();
    if (engine === null) {
      process.stdout.write(JSON.stringify({
        drained: 0,
        remaining: readQueue().length,
        error: "MCP server not built -- run 'npm run build:fast' in mcp-server first",
      }) + "\n");
      return; // (was process.exit(0); now return so the finally releases the process lock --
              // engine did NOT load so no HTTP keep-alive sockets, and the isDirect wrapper
              // force-exits after main() resolves anyway)
    }

    let drained = 0;
    let stoppedLocked = false;
    while (drained < maxPerDrain) {
      const { entry, locked } = claimNextEntry(); // atomic claim under short lock
      if (!entry) { stoppedLocked = locked; break; }
      const { result, errorMsg } = await processEntry(engine, entry); // slow, lock-free
      appendProcessed(entry, result, errorMsg);
      drained++;
    }

    process.stdout.write(JSON.stringify({
      drained,
      remaining: readQueue().length,
      ...(stoppedLocked ? { stopped: "locked" } : {}),
    }) + "\n");
  } finally {
    releaseDrainProcessLock();
  }
}

export { claimNextEntry };

// Only drain when invoked directly (node consensus-queue-drain.mjs) -- NOT on
// import. Without this guard, importing buildDrainVoiceBound for a test (or any
// consumer) triggered a real drain as a side effect. Mirrors the isDirect guard
// in octopus-first-live-record.mjs.
const isDirect = (process.argv[1] || "").replace(/\\/g, "/").endsWith("consensus-queue-drain.mjs");
if (isDirect) {
  main()
    // FORCE a clean exit after main() resolves. engine.ask() opens HTTP keep-alive
    // sockets to Ollama (:11434) that keep the event loop alive AFTER the consensus
    // is fully computed + synchronously recorded (appendProcessed/writeQueue are sync
    // and complete before main resolves). Without this the process HANGS on exit and
    // is eventually externally killed -> exit 255 (the "--max=20+ death" + the
    // per-Stop lingering-orphan the fleet-reaper had to reap, fleet-wide). All durable
    // work is done by the time we get here, so exit(0) is safe + immediate.
    .then(() => process.exit(0))
    .catch((e) => {
      process.stderr.write(`drain failed: ${e?.message ?? String(e)}\n`);
      process.exit(0); // never break Stop hook
    });
}
