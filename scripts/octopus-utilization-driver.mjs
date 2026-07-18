#!/usr/bin/env node
// scripts/octopus-utilization-driver.mjs
//
// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / U-ALPHA-OCTOPUS-DRIVER (slot:alpha).
//
// THE PROBLEM IT SOLVES -- utilization, not capacity.
//   The octopus multi-model consensus pipeline is fully built (producer +
//   coordinator + libs) and PROVEN end-to-end by octopus-first-live-record.mjs
//   (bravo's FIRST LIVE PRODUCER). But that runner fires ONE FIXED question,
//   once, by hand. There is NO engineered loop / cron driving continuous
//   octopus utilization -- so the consensus ledger had ~60 lifetime runs (most
//   of them "x" smoke tests) and the substrate sits DORMANT between manual
//   pokes. The downstream consumers (WeeklySynthesis, the system-viz consensus
//   roost, the planned `consensus-of` cross-substrate edge) starve on a feed
//   that only grows when a human remembers to run the proof.
//
// WHAT THIS DRIVER ADDS (and ONLY this -- it forks nothing).
//   A cron-drivable UTILIZATION LOOP that, each tick, ROTATES through a curated
//   pool of REAL cross-galaxy manufacturing consensus questions and runs each
//   through the existing, proven runLive() -- the SAME local-only, zero-metered-
//   spend path the first-live-record proof uses. It composes runLive; it does
//   NOT re-implement dispatch/record/publish and does NOT edit bravo's producer.
//
//   One tick therefore EXERCISES five of the substrates the operator named, at
//   once: the OCTOPUS (the driver), OLLAMA (the local Blackwell voices), HERMES
//   (the opt-in free-managed Grok cross-family voice), OBSIDIAN (the outcome
//   write-back via publishConsensusOutcome inside runLive), and the PSN (the
//   ledger -> WeeklySynthesis -> system-viz roost feed-up). The question pool is
//   spread across galaxies so utilization is FLEET-WIDE, not single-domain.
//
// ROTATION IS DETERMINISTIC (no Math.random -- resumable + testable).
//   The start index is (current ledger length) mod (pool length). Each recorded
//   run grows the ledger by one, so successive ticks naturally advance to a
//   fresh question; concurrent non-driver octopus runs only perturb the offset,
//   never break determinism for a given ledger state.
//
// CRON EXIT CONTRACT (R12, deliberately).
//   `ok` reflects HARNESS health -- did every selected question produce a runLive
//   result object (i.e. the loop did not throw and every run was RECORDED)? It is
//   NOT "did the voices answer". When Ollama is momentarily down, runLive still
//   RECORDS the transparent `dispatch-unavailable` blocker to the ledger and
//   returns ok:false; the harness counts that as a completed, recorded attempt
//   and exits 0. So a brief local-stack outage does NOT flap the scheduled task
//   red -- the ledger captures the miss (visible in the offload/consensus
//   dashboards), and fleet-task-health keys off real HRESULT launch failures,
//   not a harness-internal voice miss. The harness exits non-zero ONLY when it
//   genuinely could not run (e.g. a thrown selection/IO error).
//
// Karpathy discipline:
//   CLASSIFY: rotation/selection (pure) + an async fan-over-questions loop.
//   TECHNIQUE: deterministic modulo rotation over a frozen pool; compose the
//     proven runLive (injectable) rather than re-deriving the consensus path.
//   EDGE CASES: empty/corrupt ledger (rotation -> 0), count > pool length
//     (wrap-around, no dup within one tick beyond a full lap), a single question
//     failing mid-tick (recorded + counted, loop continues), --prompt one-off
//     with no domain, dry/hermetic mode (no network).
//   FAILURE MODES: ledger read throws (fail-soft -> offset 0), runLive throws
//     for one question (caught -> recorded as a harness-level failure for that
//     item, loop proceeds), all voices down (recorded blocker, exit 0).

import {
  runLive,
  buildLocalOnlyAskOverrides,
} from "./octopus-first-live-record.mjs";
import { readOctopusLedger } from "./lib/octopus-record-lib.mjs";

// ---------------------------------------------------------------------------
// The curated cross-galaxy consensus-question pool.
//
// Each entry is a REAL manufacturing/cross-substrate decision the diverse local
// panel can reason about meaningfully (not a smoke-test "x"). Every `prompt`
// opens with "Consensus check:" so it self-documents as a consensus ask and
// classifies route:octopus under octopus-route-policy KEYWORD_OCTOPUS_TRIGGERS
// (the dispatch path here does not gate on it, but on-demand coordinator runs do).
//
// `domain` is a VALID galaxy key -- it routes the recorded outcome to the right
// galaxy feed via publishConsensusOutcome(domain, ...) inside runLive. The pool
// spans 10 galaxies so a cron sweeping it exercises octopus utilization
// FLEET-WIDE, one galaxy per tick. Frozen so a caller can never mutate the pool
// (rotation determinism depends on a stable order + length).
// ---------------------------------------------------------------------------
export const QUESTION_POOL = Object.freeze([
  Object.freeze({
    id: "sf-4140-rough",
    domain: "speed-feed",
    prompt:
      "Consensus check: roughing 4140 prehardened steel (28-32 HRC) on a 3-axis " +
      "VMC with a 1/2-inch 4-flute carbide endmill -- is a higher radial depth with " +
      "lower axial depth, or trochoidal milling, the safer first choice to protect " +
      "tool life? Give one recommendation and the single most important reason.",
  }),
  Object.freeze({
    id: "lathe-17-4-css",
    domain: "lathe",
    prompt:
      "Consensus check: finish-turning 17-4 PH stainless at ~30 HRC on a CNC lathe -- " +
      "is constant surface speed (G96) at a 0.008 ipr feed better for chip control and " +
      "finish than constant RPM (G97)? Give one recommendation and the key reason.",
  }),
  Object.freeze({
    id: "wedm-d2-recast",
    domain: "wedm",
    prompt:
      "Consensus check: wire-EDM rough-cutting 2-inch thick D2 tool steel -- prioritize a " +
      "higher peak current with greater flush pressure, or a lower-energy setting with " +
      "added skim passes, to minimize the recast layer? One recommendation and the key reason.",
  }),
  Object.freeze({
    id: "cam-p20-finish",
    domain: "cam",
    prompt:
      "Consensus check: 3-axis finishing of a sculptured mold cavity in P20 -- is a " +
      "constant-scallop 3D toolpath or a raster at shallow stepover the better first " +
      "choice balancing surface finish against cycle time? One recommendation and why.",
  }),
  Object.freeze({
    id: "cad-counterbore-recog",
    domain: "cad",
    prompt:
      "Consensus check: recognizing a counterbored hole feature from a STEP AP242 model -- " +
      "should detection key off the coaxial cylindrical-face pair plus the planar shoulder, " +
      "or the full B-rep adjacency graph, for the most robust result? One recommendation and why.",
  }),
  Object.freeze({
    id: "quote-50pc-aluminum",
    domain: "quoting",
    prompt:
      "Consensus check: quoting a 50-piece run of a precision aluminum bracket -- is " +
      "per-piece cycle-time times shop-rate plus flat setup amortization, or an " +
      "activity-based cost roll-up, the more defensible quote basis? One recommendation and why.",
  }),
  Object.freeze({
    id: "post-fanuc-h-word",
    domain: "post-processor",
    prompt:
      "Consensus check: a Fanuc 3-axis post emitting G43 tool-length compensation -- should " +
      "the post force an explicit H-word on every tool change, or rely on modal H persistence, " +
      "to avoid a wrong-offset crash? One recommendation and the key reason.",
  }),
  Object.freeze({
    id: "mill-deep-hole-316",
    domain: "mill",
    prompt:
      "Consensus check: drilling a deep 10xD hole in 316 stainless -- is peck-drilling (G83) " +
      "with full retract, or high-pressure through-tool coolant with a chip-breaking drill, " +
      "the better first choice to evacuate chips? One recommendation and why.",
  }),
  Object.freeze({
    id: "biz-second-shift",
    domain: "business",
    prompt:
      "Consensus check: a job shop deciding whether to add a second shift -- is incremental " +
      "contribution-margin per machine-hour, or full-absorption costing including fixed " +
      "overhead, the sounder decision basis? One recommendation and the key reason.",
  }),
  Object.freeze({
    id: "token-offload-vs-filter",
    domain: "token-optimization",
    prompt:
      "Consensus check: cutting LLM token spend across a fleet of coding agents -- is " +
      "aggressive output-filtering on verbose tool output, or routing mechanical sub-tasks " +
      "to a local model, the higher-leverage first move? One recommendation and the key reason.",
  }),
]);

/**
 * Deterministic rotation index into the pool. PURE.
 * Normalizes any integer (incl. negative / non-finite) to [0, poolLen).
 *
 * @param {number} ledgerCount - current octopus ledger length (entries so far)
 * @param {number} poolLen - pool length (must be > 0)
 * @returns {number} a valid index in [0, poolLen)
 */
export function rotationIndex(ledgerCount, poolLen) {
  const len = Number.isInteger(poolLen) && poolLen > 0 ? poolLen : 1;
  const base = Number.isFinite(ledgerCount) ? Math.trunc(ledgerCount) : 0;
  return ((base % len) + len) % len;
}

/**
 * Select `count` questions starting at `startIndex`, wrapping around the pool.
 * PURE. Never throws on a bad count/index -- clamps to sane values.
 *
 * @param {number} startIndex - rotation start (normalized via modulo)
 * @param {number} count - how many to pull (clamped to >= 1)
 * @param {readonly object[]} [pool] - question pool (default QUESTION_POOL)
 * @returns {object[]} the selected question objects (length === clamped count)
 */
export function selectQuestions(startIndex, count, pool = QUESTION_POOL) {
  const list = Array.isArray(pool) && pool.length > 0 ? pool : QUESTION_POOL;
  const n = Number.isFinite(count) && count >= 1 ? Math.trunc(count) : 1;
  const start = rotationIndex(startIndex, list.length);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(list[(start + i) % list.length]);
  }
  return out;
}

/**
 * Default ledger-length reader. Fail-soft: any read/parse error -> 0 so the
 * rotation simply starts at the top of the pool rather than aborting the tick.
 *
 * @returns {number} current ledger entry count (0 on any failure)
 */
export function defaultReadLedgerCount() {
  try {
    const entries = readOctopusLedger();
    return Array.isArray(entries) ? entries.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Run ONE utilization tick: select `count` rotating questions and run each
 * through the proven runLive (local-only by default; opt-in free Grok voice).
 *
 * @param {object} [opts]
 * @param {number} [opts.count=1] - questions to run this tick (>= 1)
 * @param {boolean} [opts.withHermesGrok=false] - add the free-managed Grok voice
 * @param {readonly string[]} [opts.hermesGrokModels=[]] - OCTOPUS-HERMES-MULTIMODEL: seat ONE
 *   Grok voice per DISTINCT model id (all via the free OAuth proxy). A non-empty list
 *   auto-enables withHermesGrok. Empty/absent -> single Grok voice (back-compat).
 * @param {boolean} [opts.dry=false] - hermetic: pass dry through to runLive
 * @param {string|null} [opts.slot=null] - slot tag recorded on each ledger entry
 * @param {number} [opts.timeoutMs] - per-voice timeout forwarded to runLive
 * @param {readonly object[]} [opts.pool=QUESTION_POOL] - override the pool (tests)
 * @param {Function} [opts.runLive=runLive] - inject the runner (tests/dry)
 * @param {Function} [opts.readLedgerCount=defaultReadLedgerCount] - inject (tests)
 * @returns {Promise<{ ok, attempted, succeeded, startIndex, results }>}
 *   ok        -- HARNESS health: every selected question produced a recorded
 *                runLive result (the loop did not throw on any item).
 *   attempted -- number of questions run.
 *   succeeded -- number whose consensus actually came back ok (voices answered).
 *   startIndex-- the rotation start used (for resumability / debugging).
 *   results   -- per-question { id, domain, ok, succeeded, reason, voiceCount, verdict }.
 */
export async function runUtilizationTick(opts = {}) {
  const count = Number.isFinite(opts.count) && opts.count >= 1 ? Math.trunc(opts.count) : 1;
  // OCTOPUS-HERMES-MULTIMODEL: an explicit DISTINCT-model list seats one Grok voice per model
  // (all via the free OAuth proxy). A non-empty list auto-enables withHermesGrok (the engine
  // gates the multi-model panel behind includeGrok). Filtered to non-empty strings; engine dedupes.
  const hermesGrokModels = Array.isArray(opts.hermesGrokModels)
    ? opts.hermesGrokModels.filter((m) => typeof m === "string" && m.trim())
    : [];
  const withHermesGrok = opts.withHermesGrok === true || hermesGrokModels.length > 0;
  const dry = opts.dry === true;
  const slot = typeof opts.slot === "string" ? opts.slot : null;
  const pool = Array.isArray(opts.pool) && opts.pool.length > 0 ? opts.pool : QUESTION_POOL;
  const run = typeof opts.runLive === "function" ? opts.runLive : runLive;
  const readCount = typeof opts.readLedgerCount === "function"
    ? opts.readLedgerCount
    : defaultReadLedgerCount;

  const ledgerCount = readCount();
  const startIndex = rotationIndex(ledgerCount, pool.length);
  const questions = selectQuestions(startIndex, count, pool);

  const results = [];
  // SEQUENTIAL on purpose (NOT Promise.all): each runLive prewarms + dispatches
  // the local Ollama panel on a SINGLE GPU, which serializes model loads -- firing
  // two questions' fan-outs in parallel would thrash VRAM / OOM (the exact reason
  // prewarmPanel + the consensus engine serialize their Ollama voices). Do NOT
  // "optimize" this into a Promise.all.
  for (const q of questions) {
    // Each runLive is independently guarded: a throw on ONE question (engine
    // import failure, etc.) is recorded as a harness-level failure for that item
    // and the loop proceeds -- one bad question never aborts the whole tick.
    try {
      const r = await run({
        prompt: q.prompt,
        domain: q.domain,
        slot,
        dry,
        includeHermesGrok: withHermesGrok,
        hermesGrokModels, // OCTOPUS-HERMES-MULTIMODEL: N distinct Grok voices (empty -> single voice)
        timeoutMs: opts.timeoutMs,
      });
      const summary = r && r.summary && typeof r.summary === "object" ? r.summary : {};
      results.push({
        id: q.id,
        domain: q.domain,
        ok: true, // HARNESS-ok: runLive returned a result (recorded), no throw.
        succeeded: r && r.ok === true, // VOICE-ok: real consensus came back.
        reason: typeof summary.reason === "string" ? summary.reason : (r && r.ok ? "ok" : "no-summary"),
        voiceCount: Number.isFinite(summary.voiceCount) ? summary.voiceCount : 0,
        verdict: typeof summary.verdict === "string" ? summary.verdict.slice(0, 120) : "",
      });
    } catch (err) {
      results.push({
        id: q.id,
        domain: q.domain,
        ok: false, // HARNESS failure for this item (runLive threw).
        succeeded: false,
        reason: `runLive-threw:${err && err.message ? String(err.message).slice(0, 100) : "unknown"}`,
        voiceCount: 0,
        verdict: "",
      });
    }
  }

  const attempted = results.length;
  const succeeded = results.filter((r) => r.succeeded).length;
  // HARNESS ok: we attempted at least one and EVERY attempt was recorded (no throw).
  const ok = attempted > 0 && results.every((r) => r.ok === true);
  return { ok, attempted, succeeded, startIndex, results };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

/** Parse argv into the driver options. PURE (takes the arg array). */
export function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  const get = (name) => {
    const i = args.indexOf(name);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
  };
  const has = (name) => args.includes(name);
  const countRaw = get("--count");
  const timeoutRaw = get("--timeout-ms");
  return {
    json: has("--json"),
    dry: has("--dry"),
    list: has("--list"),
    withHermesGrok: has("--with-hermes-grok"),
    // OCTOPUS-HERMES-MULTIMODEL: comma-separated DISTINCT Grok model ids, e.g.
    // --hermes-models grok-4.3,grok-4.20-0309-reasoning. Empty/absent -> single Grok voice.
    hermesGrokModels: (() => {
      const raw = get("--hermes-models");
      return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
    })(),
    count: countRaw != null && Number.isFinite(Number(countRaw)) ? Math.max(1, Math.trunc(Number(countRaw))) : 1,
    slot: get("--slot"),
    prompt: get("--prompt"),
    domain: get("--domain"),
    timeoutMs: timeoutRaw != null && Number.isFinite(Number(timeoutRaw)) ? Math.trunc(Number(timeoutRaw)) : undefined,
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  // Operator kill switch -- pause the cron-driven utilization without
  // unregistering the scheduled task. Exits 0 (a clean, intentional skip is
  // not a harness failure) so the scheduled task stays green while disabled.
  if (process.env.PRISM_OCTOPUS_UTILIZATION_DISABLE === "1") {
    const payload = { ok: true, skipped: true, reason: "PRISM_OCTOPUS_UTILIZATION_DISABLE=1" };
    process.stdout.write(opts.json ? JSON.stringify(payload) + "\n" : "octopus utilization: DISABLED via env, skipping.\n");
    return 0;
  }

  if (opts.list) {
    const rows = QUESTION_POOL.map((q, i) => `  [${i}] ${q.domain.padEnd(18)} ${q.id}`);
    process.stdout.write(`octopus utilization pool (${QUESTION_POOL.length} questions):\n${rows.join("\n")}\n`);
    return 0;
  }

  // One-off override: run a specific operator-supplied prompt (still local-only).
  if (opts.prompt) {
    const domain = opts.domain || "token-optimization";
    let r;
    try {
      r = await runLive({
        prompt: opts.prompt,
        domain,
        slot: opts.slot,
        dry: opts.dry,
        includeHermesGrok: opts.withHermesGrok || (Array.isArray(opts.hermesGrokModels) && opts.hermesGrokModels.length > 0),
        hermesGrokModels: opts.hermesGrokModels, // OCTOPUS-HERMES-MULTIMODEL
        timeoutMs: opts.timeoutMs,
      });
    } catch (err) {
      const payload = { ok: false, mode: "one-off", reason: `runLive-threw:${err && err.message}` };
      process.stdout.write(opts.json ? JSON.stringify(payload) + "\n" : `octopus one-off FAILED: ${payload.reason}\n`);
      return 1;
    }
    const ok = r && r.ok === true;
    const payload = {
      ok: true, // harness ran + recorded
      mode: "one-off",
      domain,
      consensusOk: ok,
      reason: r && r.summary ? r.summary.reason : "no-summary",
      verdict: r && r.summary ? (r.summary.verdict || "").slice(0, 160) : "",
    };
    process.stdout.write(opts.json ? JSON.stringify(payload) + "\n"
      : `octopus one-off [${domain}] consensusOk=${ok} reason=${payload.reason}\n`);
    return 0; // harness ran (recorded); exit reflects harness health, not voices
  }

  const result = await runUtilizationTick({
    count: opts.count,
    withHermesGrok: opts.withHermesGrok,
    hermesGrokModels: opts.hermesGrokModels, // OCTOPUS-HERMES-MULTIMODEL
    dry: opts.dry,
    slot: opts.slot,
    timeoutMs: opts.timeoutMs,
  });

  if (opts.json) {
    process.stdout.write(JSON.stringify(result) + "\n");
  } else {
    const lines = result.results.map(
      (r) => `  ${r.succeeded ? "OK " : "-- "} ${r.domain.padEnd(18)} ${r.id.padEnd(22)} voices=${r.voiceCount} ${r.reason}`,
    );
    process.stdout.write(
      `octopus utilization tick: harness=${result.ok ? "ok" : "FAIL"} ` +
      `attempted=${result.attempted} consensusOk=${result.succeeded} startIdx=${result.startIndex}\n` +
      lines.join("\n") + "\n",
    );
  }
  return result.ok ? 0 : 1;
}

// Run-as-main guard: only execute the CLI when invoked directly, never on import
// (tests import the pure helpers + runUtilizationTick with injected runLive).
const invokedDirectly = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
    const argv1 = (process.argv[1] || "").replace(/\\/g, "/");
    return argv1 && here.replace(/\\/g, "/").endsWith(argv1.split("/").pop());
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main()
    .then((code) => process.exit(typeof code === "number" ? code : 0))
    .catch((err) => {
      // A throw that escapes main() is a genuine harness failure (not a voice
      // miss) -- fail loud with a non-zero exit so a cron surfaces it.
      process.stderr.write(`octopus-utilization-driver FATAL: ${err && err.stack ? err.stack : err}\n`);
      process.exit(1);
    });
}

// Re-export for callers that want to build their own askOverrides off the same
// local-only contract (parity with octopus-first-live-record's public surface).
export { buildLocalOnlyAskOverrides };
