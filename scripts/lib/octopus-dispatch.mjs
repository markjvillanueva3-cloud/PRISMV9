// scripts/lib/octopus-dispatch.mjs
//
// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P0 — the real 5-voice dispatch bridge.
//
// octopus-with-hermes-rag.mjs §3 was a STUB: it recorded five
// "pending-real-dispatch" voices and a `consensus:'stub-not-yet-merged'`
// verdict, so the ledger never reflected a real fan-out. This bridge invokes
// PRISM's real consensus orchestrator (MultiModelConsensusEngine.ask — the
// compiled `dist` build) and maps its ConsensusResult into the ledger's
// voices[] + consensus{} shape (octopus-record-lib.buildOctopusEntry).
//
// R12 fail-loud, never fake: when the engine can't be imported, or when ZERO
// voices succeed (all providers down / quota'd / offline), this returns a
// transparent failure — `consensus.verdict` names the blocker, voices carry
// the real per-voice error — it NEVER fabricates a merged verdict. A caller
// inspecting the ledger sees exactly what happened.
//
// Pure split: `mapConsensusToLedger` is a pure function (testable without any
// network/model); `dispatchOctopus` does the I/O (lazy dist import + ask()).
//
// Karpathy discipline:
//   CLASSIFY: async orchestration bridge + pure result-mapper
//   TECHNIQUE: lazy import (dist) -> ask() -> map ConsensusResult -> ledger shape
//   EDGE CASES: dist missing, ask() throws, ok:false (no voice), null consensus,
//     non-array responses, empty answer, malformed result
//   FAILURE MODES: import-fail / all-voices-fail / throw all degrade to a
//     transparent {dispatched:false, ...} — caller keeps the stub, fail-loud.

// Default location of the compiled consensus engine. Overridable for tests.
export const DEFAULT_CONSENSUS_DIST =
  "file:///H:/prism/mcp-server/dist/engines/MultiModelConsensusEngine.js";

// The 5 PSN voices, by vendor — the canonical octopus fleet. Used to render a
// stable voices[] even for vendors that didn't run (so cluster signatures are
// comparable across runs). Mirrors octopus.md's "Claude · Codex · Ollama ·
// Grok · Gemini".
const CANONICAL_VENDORS = Object.freeze([
  { id: "anthropic", vendor: "anthropic" },
  { id: "codex",     vendor: "openai" },
  { id: "ollama",    vendor: "ollama" },
  { id: "xai",       vendor: "xai" },
  { id: "google",    vendor: "google" },
]);

/**
 * Map a MultiModelConsensusEngine ConsensusResult into the octopus ledger
 * shape (voices[] + consensus{}). Pure — no I/O. Honest about failure:
 * when no model succeeded, consensus.verdict names the blocker rather than
 * inventing a merged answer.
 *
 * @param {object} cr - ConsensusResult ({ ok, responses, agreementScore, consensus, recommendation })
 * @returns {{ voices:Array, consensus:object, ok:boolean, successCount:number }}
 */
export function mapConsensusToLedger(cr) {
  const responses = Array.isArray(cr?.responses) ? cr.responses : [];
  // One voice per response that actually ran; verdict = ok/failed + a short tag.
  const voices = [];
  for (const r of responses) {
    const vendor = typeof r?.vendor === "string" ? r.vendor : "unknown";
    const model = typeof r?.model === "string" ? r.model : vendor;
    const ok = r?.ok === true;
    voices.push({
      // Ollama is the only vendor that fields MULTIPLE distinct models (the diverse
      // local panel). Bare "ollama" for both collapsed them in the ledger so a
      // 1-voice regression (a panel model dropped by the VRAM-runnable gate) was
      // NOT diagnosable. Tag ollama voices with the model id so the ledger shows
      // WHICH local voices answered; other vendors are 1:1 vendor:model -> bare
      // vendor (unchanged, back-compat). The cluster signature is verdict-pattern
      // based (octopus-record-lib buildOctopusEntry), NOT id-based, so this does
      // not affect cross-run comparability.
      id: vendor === "ollama" && model && model !== vendor ? `ollama:${model}` : vendor,
      // verdict buckets the consensus signature: "answered" vs "failed:<reason>".
      verdict: ok ? "answered" : `failed:${shortErr(r?.error)}`,
      score: ok ? 1 : 0,
      dissent: ok ? null : `${model}: ${typeof r?.error === "string" ? r.error : "error"}`,
    });
  }
  // If the engine returned no responses at all, still emit the canonical roster
  // marked unreachable so the ledger line is shaped like a real run.
  if (voices.length === 0) {
    for (const v of CANONICAL_VENDORS) {
      voices.push({ id: v.id, verdict: "failed:not-invoked", score: 0, dissent: null });
    }
  }

  const successCount = Number.isFinite(Number(cr?.successCount))
    ? Number(cr.successCount)
    : voices.filter((v) => v.verdict === "answered").length;
  const ok = cr?.ok === true && successCount > 0;

  // Dissent items: the verbatim per-voice failure reasons + (if ≥2 succeeded
  // but disagreed) the recommendation that flagged it. The engine's own
  // agreementScore feeds confidence.
  const dissentItems = [];
  for (const r of responses) {
    if (r?.ok !== true && typeof r?.error === "string") {
      dissentItems.push(`${r.vendor || "?"}:${shortErr(r.error)}`);
    }
  }
  const recommendation = typeof cr?.recommendation === "string" ? cr.recommendation : "escalate";
  if (ok && recommendation !== "accept") {
    dissentItems.push(`recommendation:${recommendation}`);
  }

  let verdict;
  if (ok) {
    const ans = typeof cr?.consensus?.answer === "string" ? cr.consensus.answer : "";
    // The verdict is the MERGED answer (truncated) — this is the de-stub: a real
    // consensus answer, not "stub-not-yet-merged".
    verdict = ans.length > 0 ? ans.slice(0, 240) : `consensus-ok:${recommendation}`;
  } else {
    // Honest blocker — NOT a fake merge. Names every voice's failure.
    const reasons = dissentItems.length > 0 ? dissentItems.join("; ") : "no-voice-reachable";
    verdict = `no-consensus:${reasons}`.slice(0, 240);
  }

  const confidence = Number.isFinite(Number(cr?.consensus?.confidence))
    ? Number(cr.consensus.confidence)
    : (Number.isFinite(Number(cr?.agreementScore)) ? Number(cr.agreementScore) : null);

  return {
    voices,
    consensus: { verdict, confidence, dissent_items: dissentItems.slice(0, 16) },
    ok,
    successCount,
  };
}

function shortErr(e) {
  const s = typeof e === "string" ? e : "error";
  // Collapse long provider error bodies to a short tag.
  if (/ENOENT/.test(s)) return "spawn-enoent";
  if (/429|quota/i.test(s)) return "quota-429";
  if (/fetch failed|ECONNREFUSED|timeout|timed out/i.test(s)) return "unreachable";
  return s.replace(/\s+/g, " ").slice(0, 40);
}

/**
 * Invoke the real consensus fan-out. Lazy-imports the compiled engine so a
 * missing dist never breaks the orchestrator. Returns a discriminated result:
 *   { dispatched:true,  mapped, raw }   — engine ran (mapped may still be ok:false)
 *   { dispatched:false, reason }        — engine unavailable / threw
 *
 * @param {object} args
 * @param {string} args.prompt           - the operator prompt
 * @param {string} [args.context]        - shared substrate context (from the curator)
 * @param {object} [args.askOverrides]   - merged into the ask() input (test/headless tuning)
 * @param {Function} [args.engineFactory] - inject the engine (tests); default lazy-imports dist
 * @param {string} [args.distUrl]        - override dist path (tests)
 * @returns {Promise<object>}
 */
export async function dispatchOctopus({ prompt, context = "", askOverrides = {}, engineFactory = null, distUrl = DEFAULT_CONSENSUS_DIST }) {
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return { dispatched: false, reason: "empty-prompt" };
  }
  let engine;
  try {
    if (typeof engineFactory === "function") {
      engine = await engineFactory();
    } else {
      const mod = await import(distUrl);
      engine = mod?.multiModelConsensusEngine;
    }
  } catch (e) {
    return { dispatched: false, reason: `engine-import-failed:${e?.message || "error"}` };
  }
  if (!engine || typeof engine.ask !== "function") {
    return { dispatched: false, reason: "engine-missing-ask" };
  }

  // Headless defaults — Claude isn't a subprocess voice here (this script may
  // run inside or outside a session); the orchestrator owns Claude separately.
  // The operator/env tunes the live providers via askOverrides.
  const askInput = {
    prompt,
    context: context || undefined,
    includeClaude: false,
    prismContext: true,
    persist: false,
    timeoutMs: 60000,
    taskType: "octopus-hermes",
    callerEngine: "octopus-with-hermes-rag",
    ...askOverrides,
  };

  let raw;
  try {
    raw = await engine.ask(askInput);
  } catch (e) {
    return { dispatched: false, reason: `ask-threw:${e?.message || "error"}` };
  }
  return { dispatched: true, mapped: mapConsensusToLedger(raw), raw };
}
