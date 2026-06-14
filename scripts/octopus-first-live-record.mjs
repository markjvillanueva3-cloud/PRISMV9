#!/usr/bin/env node
// scripts/octopus-first-live-record.mjs
//
// PSN-OCTOPUS-FLEET-SYNERGY-MS0 -- the FIRST LIVE PRODUCER (slot:bravo).
//
// The octopus consensus pipeline is fully wired but DORMANT: the real fan-out
// only fires when PRISM_OCTOPUS_LIVE_DISPATCH=1, and the consumption feed
// (state/shared/octopus-outcomes/) was therefore EMPTY -- every downstream
// consumer (WeeklySynthesis, system-viz roost, the planned `consensus-of`
// cross-substrate edge) was reading a fail-soft empty feed. This runner fires
// ONE real, LOCAL-ONLY consensus and records a real outcome, proving the
// producer->feed->consumer chain end-to-end.
//
// HARD SAFETY BOUND -- LOCAL-ONLY, ZERO EXTERNAL SPEND:
//   MultiModelConsensusEngine.ask() fans a prompt to Claude + Codex + Grok +
//   Gemini + Ollama. The external voices are env/flag gated:
//     - includeGrok   requires process.env.XAI_API_KEY  (engine line 441)
//     - includeGemini requires GEMINI_API_KEY ?? GOOGLE_API_KEY (engine line 442)
//     - includeClaude defaults true but the dispatch bridge already pins it
//       false (octopus-dispatch.mjs line 168); we re-pin it via askOverrides.
//     - includeCodex disables the codex (ChatGPT-subscription) voice. Default
//       true, so buildLocalOnlyAskOverrides() sets includeCodex:false to drop it
//       cleanly (U-INCLUDE-CODEX added the flag; the engine used to call codex
//       UNCONDITIONALLY). As defense-in-depth, buildLocalOnlyEnv() ALSO points
//       PRISM_CODEX_BIN (CodexClientEngine reads it ?? "codex") at a sentinel so
//       even an unexpected codex call fails before any network/spend.
//   So buildLocalOnlyEnv() CLEARS the three external API keys + sentinels codex,
//   and buildLocalOnlyAskOverrides() disables Claude/Codex/Grok/Gemini and forces
//   the CO-RESIDENT diverse LOCAL panel (qwen2.5-coder:32b + gpt-oss:20b = 50GB <
//   96GB VRAM; the 102GB 120b+32b pair could not co-reside -> 1 voice). Result:
//   the only voices that can SUCCEED are the two local Ollama models -- free, resident.
//
// Karpathy discipline:
//   CLASSIFY: live-dispatch orchestration + pure env/result helpers
//   TECHNIQUE: compose dispatchOctopus + recordOctopusRun + publishConsensusOutcome
//     (NO edits to the libs, NO child_process -- pure composition)
//   EDGE CASES: zero successful voices, missing domain, dispatch unavailable,
//     empty dispatch result, dry/hermetic mode, idempotent re-run
//   FAILURE MODES: engine unreachable / all-voices-fail -> non-zero exit + the
//     transparent blocker recorded (R12 fail-loud), never a fake outcome.

import { dispatchOctopus } from "./lib/octopus-dispatch.mjs";
import { recordOctopusRun } from "./lib/octopus-record-lib.mjs";
import { publishConsensusOutcome } from "./lib/octopus-consumption-bridge.mjs";
import { callOllamaOnce } from "./lib/ollama-fanout.mjs";

// A sentinel binary path that does NOT exist on any host -- used to neutralize
// the unconditional codex voice so it fails (ok:false) before any external
// spend. Distinctive name so a future reader sees exactly why it is here.
export const CODEX_NEUTRALIZE_SENTINEL =
  "prism-octopus-local-only-no-codex-DO-NOT-INSTALL";

// The two free, resident, CO-RESIDENT local voices this runner binds to.
// CO-RESIDENCY-CORRECT (live finding 2026-06-10, mirrors consensus-queue-drain):
// gpt-oss:120b(65GB) + qwen2.5-coder:32b(37GB) = 102GB > 96GB Blackwell VRAM ->
// can't co-reside -> resolveDiverseOllamaPanel (MultiModelConsensusEngine:403)
// intersects the panel with the capability probe's free-VRAM runnable set and
// DROPS the 120b -> the runner seated only 1 voice (proven: voiceCount:1, never
// met requireMinVoices:2). qwen2.5-coder:32b(37GB, code specialist) + gpt-oss:20b
// (13GB, general reasoner) = 50GB < 96GB: both resident, two DISTINCT families ->
// a genuine fast 2-voice consensus at $0. (The 120b stays the deeper octopus
// voice for the non-fast path; this runner proves the diverse 2-voice chain.)
export const LOCAL_ONLY_PANEL = Object.freeze([
  "qwen2.5-coder:32b",
  "gpt-oss:20b",
]);

// Default per-voice timeout. A cold 120b MoE load can take a while on first
// touch; keep this generous so a cold model is not mis-counted as a failure.
export const DEFAULT_LOCAL_TIMEOUT_MS = 240_000;

// A seeded prompt that the route policy classifies as route:octopus (it contains
// the "consensus" keyword trigger -- octopus-route-policy KEYWORD_OCTOPUS_TRIGGERS).
// Manufacturing-domain so the local voices reason in PRISM's wheelhouse.
export const DEFAULT_SEED_PROMPT =
  "Consensus check: for roughing 4140 prehardened steel (28-32 HRC) on a 3-axis " +
  "VMC with a 1/2-inch 4-flute carbide endmill, is a higher radial depth with " +
  "lower axial depth, or trochoidal milling, the safer first choice to protect " +
  "tool life? Give one recommendation and the single most important reason.";

/**
 * Build the LOCAL-ONLY environment mutations. PURE -- returns a plain object of
 * { KEY: value }; the caller decides when to apply them to process.env. This is
 * the testable safety core: it MUST clear every external-voice API key and
 * neutralize codex so no external provider can spend.
 *
 * @param {object} [baseEnv] - the env to derive from (default process.env). Only
 *   read, never mutated. Tests pass a fake env to assert the exact mutations.
 * @returns {Record<string,string>} the keys to SET on process.env for local-only.
 *   API keys are set to "" (empty string -> Boolean("") === false -> voice skipped).
 */
export function buildLocalOnlyEnv(baseEnv = process.env) {
  const env = baseEnv && typeof baseEnv === "object" ? baseEnv : {};
  return {
    // Arm the real fan-out (the dispatch bridge does not read this, but the
    // wider pipeline / any composed CLI path keys off it; set it so the runner
    // is honest about being in live mode).
    PRISM_OCTOPUS_LIVE_DISPATCH: "1",
    // Clear external API keys -> includeGrok / includeGemini evaluate false
    // (engine reads Boolean(process.env.XAI_API_KEY) etc.). Empty string, not
    // delete, so the shape is deterministic + assertable.
    XAI_API_KEY: "",
    GEMINI_API_KEY: "",
    GOOGLE_API_KEY: "",
    // Neutralize the unconditional codex voice -- sentinel binary -> spawn fails
    // -> ok:false -> zero external spend.
    PRISM_CODEX_BIN: CODEX_NEUTRALIZE_SENTINEL,
    // Keep the prior value visible for the summary/debug (not applied to env).
    _PRISM_PRIOR_CODEX_BIN: typeof env.PRISM_CODEX_BIN === "string" ? env.PRISM_CODEX_BIN : "",
  };
}

/**
 * Build the askOverrides that bind the consensus to the LOCAL diverse panel.
 * PURE. Forces includeClaude/includeGrok/includeGemini false (belt-and-suspenders
 * with the env clears) and seats exactly the local panel via diverseLocalPanel.
 *
 * @param {object} [opts]
 * @param {readonly string[]} [opts.panel] - local model ids (default LOCAL_ONLY_PANEL)
 * @param {number} [opts.timeoutMs] - per-voice timeout (default DEFAULT_LOCAL_TIMEOUT_MS)
 * @returns {object} askOverrides merged into the consensus ask() input
 */
export function buildLocalOnlyAskOverrides(opts = {}) {
  const panel = Array.isArray(opts.panel) && opts.panel.length > 0 ? opts.panel : LOCAL_ONLY_PANEL;
  const timeoutMs = Number.isFinite(opts.timeoutMs) && opts.timeoutMs > 0
    ? Math.floor(opts.timeoutMs)
    : DEFAULT_LOCAL_TIMEOUT_MS;
  return {
    includeClaude: false,
    includeCodex: false, // CLEAN codex disable (engine includeCodex flag) -- no
                         // phantom failed:spawn-enoent voice in the ledger. The
                         // PRISM_CODEX_BIN sentinel in buildLocalOnlyEnv() stays
                         // as defense-in-depth (zero-spend even if codex re-enters).
    includeGrok: false,
    includeGemini: false,
    diverseLocalPanel: true,
    diverseLocalModels: panel,
    // forceProbe: this runner PREWARMS its panel (runLive -> prewarmPanel) before
    // dispatch, so the engine must take a FRESH capability probe -- the 5-min cache
    // could otherwise hold a stale runnable-set from when VRAM was occupied and drop
    // a model that is now resident, collapsing the panel to a single voice.
    forceProbe: true,
    prismContext: false, // self-contained prompt; skip the extra context-build cost
    persist: false,      // this is a one-shot proof; do not pollute the wiki second-brain
    timeoutMs,
  };
}

/**
 * Prewarm the local panel models so a subsequent FORCED capability probe sees
 * them RESIDENT (runnable). Without this, the engine's VRAM-runnable gate can
 * drop a model that simply was not loaded at probe time -- collapsing the diverse
 * panel to a single voice. Fires one trivial /api/generate per model (loads it),
 * fail-soft: a cold-load timeout/throw NEVER aborts the run -- worst case the
 * unwarmed model is dropped exactly as before. Injectable for tests.
 *
 * @param {readonly string[]} models - the panel model ids to warm
 * @param {object} [opts]
 * @param {Function} [opts.callOllama] - inject the loader (default callOllamaOnce)
 * @param {number} [opts.timeoutMs] - per-model load timeout (default 120000)
 * @returns {Promise<string[]>} the subset of models that warmed ok
 */
export async function prewarmPanel(models, opts = {}) {
  const call = typeof opts.callOllama === "function" ? opts.callOllama : callOllamaOnce;
  const timeoutMs = Number.isFinite(opts.timeoutMs) && opts.timeoutMs > 0 ? Math.floor(opts.timeoutMs) : 120_000;
  const list = Array.isArray(models) ? models : [];
  const warmed = [];
  // SEQUENTIAL on purpose (NOT Promise.all): a single GPU serializes model loads;
  // firing /api/generate at two models in parallel thrashes VRAM / OOMs -- the same
  // reason the engine serializes its Ollama voices (MultiModelConsensusEngine ~577).
  for (const m of list) {
    if (typeof m !== "string" || !m) continue;
    try {
      const r = await call("warm", { model: m, timeoutMs });
      if (r && r.ok) warmed.push(m);
    } catch { /* fail-soft: a cold-load timeout/throw must not abort the proof */ }
  }
  return warmed;
}

/**
 * Summarize a dispatchOctopus result into a flat, assertable shape. PURE.
 * Honest about every failure mode: an unavailable dispatch, an empty/garbage
 * result, and a real run where ZERO voices answered all map to ok:false with a
 * named reason -- never a fabricated success.
 *
 * @param {object} dr - the dispatchOctopus return value
 * @returns {{ ok:boolean, successCount:number, verdict:string, voiceCount:number,
 *   answeredVoices:string[], reason:string }}
 */
export function summarizeDispatch(dr) {
  // A dispatch result is a PLAIN object with a `dispatched` discriminant; a
  // non-object OR an array is a malformed result, not an unavailable dispatch.
  if (!dr || typeof dr !== "object" || Array.isArray(dr)) {
    return { ok: false, successCount: 0, verdict: "", voiceCount: 0, answeredVoices: [], reason: "no-dispatch-result" };
  }
  if (dr.dispatched !== true) {
    const reason = typeof dr.reason === "string" && dr.reason ? dr.reason : "dispatch-unavailable";
    return { ok: false, successCount: 0, verdict: "", voiceCount: 0, answeredVoices: [], reason: `dispatch-unavailable:${reason}` };
  }
  const mapped = dr.mapped && typeof dr.mapped === "object" ? dr.mapped : {};
  const voices = Array.isArray(mapped.voices) ? mapped.voices : [];
  const consensus = mapped.consensus && typeof mapped.consensus === "object" ? mapped.consensus : {};
  const verdict = typeof consensus.verdict === "string" ? consensus.verdict : "";
  const successCount = Number.isFinite(Number(mapped.successCount))
    ? Number(mapped.successCount)
    : voices.filter((v) => v && v.verdict === "answered").length;
  const answeredVoices = voices.filter((v) => v && v.verdict === "answered").map((v) => String(v.id ?? "unknown"));
  // R12: ok ONLY when the mapped result is ok AND at least one voice answered.
  const ok = mapped.ok === true && successCount > 0;
  return {
    ok,
    successCount,
    verdict,
    voiceCount: voices.length,
    answeredVoices,
    reason: ok ? "ok" : (successCount === 0 ? "zero-voices-answered" : "consensus-not-ok"),
  };
}

/**
 * Run ONE live (or dry) local-only octopus consensus, record the ledger entry,
 * and publish the galaxy outcome. Composes the existing libs -- never edits them.
 *
 * @param {object} args
 * @param {string} args.prompt - the seeded prompt (must classify route:octopus)
 * @param {string} args.domain - galaxy key for the outcome feed (e.g. "hermes-zulu")
 * @param {string} [args.slot] - slot tag for the ledger entry
 * @param {boolean} [args.dry] - hermetic mode: do NOT fire live; use injected dispatch
 * @param {Function} [args.dispatch] - inject dispatchOctopus (tests / dry mode)
 * @param {Function} [args.record] - inject recordOctopusRun (tests)
 * @param {Function} [args.publish] - inject publishConsensusOutcome (tests)
 * @param {Function} [args.applyEnv] - inject env-apply (tests assert the mutations)
 * @param {object} [args.askOverrides] - override the local-only askOverrides (tests)
 * @returns {Promise<{ ok, summary, ledgerPath, outcome, requireMinVoices, meetsFloor }>}
 */
export async function runLive(args = {}) {
  const prompt = typeof args.prompt === "string" && args.prompt.trim() ? args.prompt : DEFAULT_SEED_PROMPT;
  const domain = typeof args.domain === "string" && args.domain.trim() ? args.domain.trim() : "";
  const slot = typeof args.slot === "string" ? args.slot : null;
  const dry = args.dry === true;
  const requireMinVoices = Number.isFinite(args.requireMinVoices) ? Number(args.requireMinVoices) : 2;

  const dispatch = typeof args.dispatch === "function" ? args.dispatch : dispatchOctopus;
  const record = typeof args.record === "function" ? args.record : recordOctopusRun;
  const publish = typeof args.publish === "function" ? args.publish : publishConsensusOutcome;
  const applyEnv = typeof args.applyEnv === "function" ? args.applyEnv : defaultApplyEnv;

  if (!domain) {
    // Missing domain -> the outcome feed cannot fire (publishConsensusOutcome
    // needs a safe domain). Fail loud rather than silently skipping the feed.
    return {
      ok: false,
      summary: { ok: false, successCount: 0, verdict: "", voiceCount: 0, answeredVoices: [], reason: "missing-domain" },
      ledgerPath: null,
      outcome: null,
      requireMinVoices,
      meetsFloor: false,
    };
  }

  // Apply the LOCAL-ONLY env mutations BEFORE dispatch so the consensus engine
  // (lazy-imported inside dispatchOctopus) reads the cleared keys + sentinel
  // codex bin. In dry mode the injected dispatch ignores env, but we still apply
  // so a dry run exercises the same code path (the env mutations are pure).
  const envMutations = buildLocalOnlyEnv();
  applyEnv(envMutations);

  const askOverrides = args.askOverrides && typeof args.askOverrides === "object"
    ? args.askOverrides
    : buildLocalOnlyAskOverrides({ timeoutMs: args.timeoutMs });

  // PREWARM the diverse local panel BEFORE dispatch so the engine's FORCED probe
  // (forceProbe in askOverrides) sees both models resident -> the full 2-voice
  // panel seats instead of the runnable gate dropping an unloaded model.
  // Default prewarm: the REAL loader on a live run, a NO-OP when a test injects its
  // own dispatch (keeps every existing hermetic test network-free without each one
  // injecting a prewarm). An explicit args.prewarm overrides both -> a test can
  // assert prewarm IS called with the panel. Runs only when !dry + diverse panel;
  // prewarmPanel is itself fail-soft (a cold-load never aborts the proof).
  const noopPrewarm = async () => [];
  const prewarm = typeof args.prewarm === "function"
    ? args.prewarm
    : (typeof args.dispatch === "function" ? noopPrewarm : prewarmPanel);
  if (!dry && askOverrides.diverseLocalPanel) {
    const panel = Array.isArray(askOverrides.diverseLocalModels) && askOverrides.diverseLocalModels.length
      ? askOverrides.diverseLocalModels
      : LOCAL_ONLY_PANEL;
    await prewarm(panel);
  }

  // In dry/hermetic mode the caller MUST inject a dispatch; if they did not,
  // synthesize a transparent no-network result so the runner never touches Ollama.
  let dr;
  if (dry && typeof args.dispatch !== "function") {
    dr = { dispatched: false, reason: "dry-mode-no-injected-dispatch" };
  } else {
    dr = await dispatch({ prompt, askOverrides });
  }

  const summary = summarizeDispatch(dr);

  // Record the run to the Hermes ledger regardless of outcome (R12: capture the
  // transparent blocker too). Build voices/consensus from the mapped result when
  // present, else a single stub voice naming the dispatch failure.
  let voices;
  let consensus;
  if (dr && dr.dispatched === true && dr.mapped) {
    voices = Array.isArray(dr.mapped.voices) && dr.mapped.voices.length > 0
      ? dr.mapped.voices
      : [{ id: "ollama", verdict: "failed:no-voice" }];
    consensus = dr.mapped.consensus && typeof dr.mapped.consensus === "object"
      ? dr.mapped.consensus
      : { verdict: summary.verdict || "no-consensus", dissent_items: [] };
  } else {
    voices = [{ id: "ollama", verdict: `live-dispatch-unavailable:${summary.reason}` }];
    consensus = { verdict: `dispatch-unavailable:${summary.reason}`.slice(0, 240), dissent_items: [] };
  }

  let ledgerPath = null;
  try {
    const rec = record({
      prompt,
      voices,
      consensus,
      routerDecision: "route:octopus",
      slot,
    }, typeof args.ledgerOpts === "object" ? args.ledgerOpts : {});
    ledgerPath = rec && rec.ledger ? rec.ledger : null;
  } catch {
    // record is best-effort telemetry; never let it abort the proof.
    ledgerPath = null;
  }

  // Publish the galaxy outcome ONLY on a real success (>=1 answered voice). On a
  // zero-voice / failed run we do NOT fabricate an outcome -- the feed stays
  // honest (the consumption bridge would refuse a no-publishable-consensus
  // anyway, but gating here makes the intent explicit).
  let outcome = null;
  if (summary.ok) {
    outcome = publish(domain, consensus, {
      at: new Date().toISOString(),
      voices,
      successCount: summary.successCount,
      ...(typeof args.outcomeBaseDir === "string" ? { baseDir: args.outcomeBaseDir } : {}),
    });
  }

  // Overall ok requires a real success AND the minimum local-voice floor.
  const meetsFloor = summary.successCount >= requireMinVoices;
  const ok = summary.ok && meetsFloor && Boolean(outcome && outcome.ok);

  return { ok, summary, ledgerPath, outcome, requireMinVoices, meetsFloor };
}

/** Default env-applier -- sets every mutation on process.env (skips _-prefixed debug keys). */
function defaultApplyEnv(mutations) {
  if (!mutations || typeof mutations !== "object") return;
  for (const [k, v] of Object.entries(mutations)) {
    if (k.startsWith("_")) continue; // debug-only keys are not applied
    process.env[k] = String(v);
  }
}

function parseArgs(argv) {
  const out = { prompt: "", domain: "", slot: process.env.PRISM_SLOT || null, dry: false, json: false, requireMinVoices: 2 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--prompt") { out.prompt = argv[++i] || ""; continue; }
    if (a === "--domain") { out.domain = argv[++i] || ""; continue; }
    if (a === "--slot") { out.slot = argv[++i] || null; continue; }
    if (a === "--dry") { out.dry = true; continue; }
    if (a === "--json") { out.json = true; continue; }
    if (a === "--require-min-voices") { out.requireMinVoices = Number(argv[++i]) || 2; continue; }
  }
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const prompt = opts.prompt || DEFAULT_SEED_PROMPT;
  // Default the domain to bravo's galaxy (hermes-zulu) when unspecified -- a real,
  // SAFE_DOMAIN_RE-valid galaxy key so the outcome feed fires.
  const domain = opts.domain || "hermes-zulu";

  if (opts.dry) {
    // Hermetic dry mode at the CLI: inject a deterministic 2-local-voice success
    // so an operator can smoke the wiring with NO network/Ollama touch.
    const fakeDispatch = async () => ({
      dispatched: true,
      mapped: {
        ok: true,
        successCount: 2,
        voices: [
          { id: "ollama", verdict: "answered", score: 1, dissent: null },
          { id: "ollama", verdict: "answered", score: 1, dissent: null },
        ],
        consensus: { verdict: "dry-run: trochoidal milling protects tool life via constant chip load.", confidence: 0.8, dissent_items: [] },
      },
    });
    const dryRes = await runLive({ prompt, domain, slot: opts.slot, dry: true, dispatch: fakeDispatch });
    emit(dryRes, opts.json, true);
    process.exit(dryRes.ok ? 0 : 1);
  }

  const res = await runLive({ prompt, domain, slot: opts.slot, requireMinVoices: opts.requireMinVoices });
  emit(res, opts.json, false);
  // R12 fail-loud: non-zero exit when the live dispatch produced < requireMinVoices
  // successful local voices (no real consensus landed).
  process.exit(res.ok ? 0 : 1);
}

function emit(res, json, dry) {
  if (json) {
    process.stdout.write(JSON.stringify(res, null, 2) + "\n");
    return;
  }
  const s = res.summary;
  const lines = [
    `Mode: ${dry ? "DRY (hermetic, no network)" : "LIVE (local-only)"}`,
    `Dispatched ok: ${s.ok}  successCount: ${s.successCount}  (floor>=${res.requireMinVoices}: ${res.meetsFloor})`,
    `Answered voices: ${s.answeredVoices.join(", ") || "(none)"}`,
    `Consensus verdict: ${s.verdict || "(none)"}`,
    `Reason: ${s.reason}`,
    `Ledger: ${res.ledgerPath || "(not written)"}`,
    `Outcome feed: ${res.outcome ? (res.outcome.ok ? res.outcome.path : `FAILED:${res.outcome.error}`) : "(not published)"}`,
    `OVERALL: ${res.ok ? "PASS -- real local consensus landed" : "FAIL -- no real >=floor consensus (see Reason)"}`,
  ];
  process.stdout.write(lines.join("\n") + "\n");
}

// Only run main() when invoked directly (not when imported by the test).
const isDirect = (process.argv[1] || "").replace(/\\/g, "/").endsWith("octopus-first-live-record.mjs");

if (isDirect) {
  main().catch((e) => {
    process.stderr.write(`fatal: ${e?.message || e}\n`);
    process.exit(1);
  });
}
