// scripts/lib/verified-offload-tiered.mjs
// U-HERMES-VERIFIED-TIER (2026-06-24, slot:alpha): the TIERED form of the
// verified-offload keystone (./ollama-verified-offload.mjs). Closes the verified
// gap "the Hermes lane is BUILT + instrumented but DARK": ask-hermes.mjs records
// byHook["ask-hermes"] into the canonical offload-stats, yet NOTHING automated
// invokes the strong lane, so gradeHermesUtilization() reads "no ask-hermes
// activity recorded" forever (verified live: byHook["ask-hermes"] absent from the
// dashboard; offloaded=1, executedOffloads=0).
//
// THE CONTRACT -- composition, NOT a fork (R8). verifiedOffload already accepts an
// injected `run` thunk + a pure `verify` + a REQUIRED `fallback`. A tiered offload
// is just that primitive applied across two runners in priority order:
//
//   tier 'strong': Hermes (paid, stronger-than-Ollama)  --verify--> pass => DONE (source 'hermes')
//                  throw / empty / verify-fail            ------------------> DESCEND
//   then:          Ollama (free, local)                  --verify--> pass => DONE (source 'ollama-fallback')
//                  throw / empty / verify-fail            ------------------> fallback() (trusted Claude/raw; source 'kept')
//
// Every off-Claude verified result is recorded into the SAME canonical
// offload-stats the dashboard reads, via ask-hermes's exported `tallyUsage`. So a
// single real Hermes verified offload moves byHook["ask-hermes"].fired 0 -> >=1 --
// the dark lane lights, measurably.
//
// PURE-ORCHESTRATION: the runners AND the telemetry sink are INJECTED, so the
// tiering logic is hermetically testable (R9) with zero network. The factories
// makeHermesRunner / makeOllamaRunner build the real runners for the CLI/harness.
//
// SAFETY: the verifier is the SAME code gate on EVERY tier -- a hallucinated Hermes
// answer is REJECTED exactly like a hallucinated Ollama answer, never trusted.
// `fallback` is REQUIRED (no auto-offload, strong or local, without a trusted
// floor). ASCII-only, fail-safe (telemetry never breaks the offload).
//
// TAXONOMY NOTE (R7, surfaced not silent): tallyUsage counts a source as an
// `offloaded` only when it is "hermes" or "ollama-fallback". This lib therefore
// tags ANY verified Ollama result "ollama-fallback" -- in this ladder Ollama IS
// the fallback lane below the strong Hermes tier, so the name is honest whether or
// not Hermes was attempted this call. A distinct local-only "ollama" source would
// require a (purely additive) predicate change in ask-hermes.mjs#tallyUsage; left
// as a clean follow-up to keep this unit surgical to two new files.

import { atomicOffloadStatsRMW } from "./offload-stats-bump.mjs";
import { resolve } from "node:path";
import { verifiedOffload } from "./ollama-verified-offload.mjs";
import { callOllamaOnce } from "./ollama-fanout.mjs";
import { buildChatBody, parseChatResponse, tallyUsage, estimateHermesSaved } from "../ask-hermes.mjs";
// GROK-HIGHEST-CAPABILITY (operator /goal 2026-06-26): single source for the served default.
import { GROK_CAPABILITY_DEFAULT } from "./grok-capability-rank.mjs";

const REPO_ROOT = process.env.PRISM_REPO_ROOT || "H:/prism";
const STATS_PATH = process.env.PRISM_HERMES_STATS_PATH || resolve(REPO_ROOT, "mcp-server/data/state/ollama-offload-stats.json");
const DEFAULT_HERMES_URL = process.env.PRISM_HERMES_PROXY_URL || "http://127.0.0.1:8645/v1";
const DEFAULT_HERMES_TOKEN = process.env.PRISM_HERMES_TOKEN || "prism";
const DEFAULT_OLLAMA_MODEL = process.env.PRISM_OLLAMA_OFFLOAD_MODEL || "gpt-oss:20b";
const DEFAULT_TIMEOUT_MS = Number(process.env.PRISM_TIERED_OFFLOAD_TIMEOUT_MS) || 120000;
// OLLAMA-tier timeout: env-knobbed + defaulted SEPARATELY from the Hermes tier. A cold
// qwen gist can need >9s under GPU load -- the sibling ollama-route summarize timeout was
// bumped 9s->30s IN CODE for exactly this (2026-06-10, zulu). A knob lets ops raise the
// local tier under load without a code change. Mirrors the Hermes tier's env-knob pattern.
export const DEFAULT_OLLAMA_TIMEOUT_MS = Number(process.env.PRISM_TIERED_OLLAMA_TIMEOUT_MS) || 30000;
// HERMES model default: a Hermes chat REQUIRES a model id. If a caller omits it
// (e.g. the ollama-offload `classify-strong` CLI with no --hermes-model), sending
// model:undefined makes the proxy reject the call -> empty -> the strong tier
// silently descends and never fires. Default to the configured Hermes model so the
// strong tier actually runs. Mirrors ask-hermes.mjs FALLBACK_HERMES_MODEL.
const DEFAULT_HERMES_MODEL = process.env.PRISM_HERMES_MODEL || process.env.PRISM_HERMES_PREFERRED_MODEL || process.env.PRISM_HERMES_FALLBACK_MODEL || GROK_CAPABILITY_DEFAULT;

// Distinct Symbol so the strong tier can tell "Hermes produced no VERIFIED result"
// (verifiedOffload fellBack to this sentinel) apart from a real verified value.
const HERMES_FELLBACK = Symbol("hermes-fellback");

/**
 * Build a real Hermes runner thunk for verifiedOffload. Returns "" on any
 * non-usable response (network/timeout/HTTP-error/parse-fail/refusal) so
 * verifiedOffload treats it as run-empty and DESCENDS. The runner NEVER throws out
 * (a throw would also descend, but "" keeps the reason clean). Injectable fetchImpl
 * for hermetic tests.
 * @returns {() => Promise<string>}
 */
export function makeHermesRunner({ mode = "ask", input = "", model = DEFAULT_HERMES_MODEL, url = DEFAULT_HERMES_URL, token = DEFAULT_HERMES_TOKEN, timeoutMs = DEFAULT_TIMEOUT_MS, maxTokens, fetchImpl } = {}) {
  if (!model) model = DEFAULT_HERMES_MODEL; // guard an explicit null/"" -> still send a real model id
  const doFetch = fetchImpl || fetch;
  return async () => {
    const body = buildChatBody({ mode, input, model, maxTokens });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await doFetch(`${url}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res || !res.ok) return "";
      const json = await res.json();
      const parsed = parseChatResponse(json);
      return parsed.ok ? parsed.content : "";
    } catch {
      return ""; // network/timeout/abort -> empty -> descend (never throw out of the runner)
    } finally {
      clearTimeout(timer);
    }
  };
}

/**
 * Build a real Ollama runner thunk for verifiedOffload. Returns "" on any failure
 * so verifiedOffload descends to the trusted fallback. Injectable callImpl for
 * hermetic tests (defaults to callOllamaOnce from ollama-fanout.mjs).
 * @returns {() => Promise<string>}
 */
export function makeOllamaRunner({ input = "", model = DEFAULT_OLLAMA_MODEL, timeoutMs = DEFAULT_OLLAMA_TIMEOUT_MS, callImpl } = {}) {
  const call = callImpl || callOllamaOnce;
  return async () => {
    const r = await call(input, { model, timeoutMs, temperature: 0 });
    return r && r.ok ? r.text : "";
  };
}

/**
 * Record one tiered-offload call into the canonical offload-stats via the exported
 * `tallyUsage` (the SAME byHook["ask-hermes"] tally ask-hermes writes), wrapped in the
 * shared fail-safe atomic-RMW envelope (./offload-stats-bump.mjs) -- never CREATES the
 * file, never throws, atomic tmp+rename. Returns true iff the stats file was updated.
 * @param {{source:string, mode?:string, tokensSaved?:number, now?:string}} call
 */
export function recordTieredUsage(call, { statsPath = STATS_PATH } = {}) {
  return atomicOffloadStatsRMW(statsPath, (stats) => tallyUsage(stats, call));
}

/**
 * verifiedTieredOffload -- run a verified offload across the Hermes(strong) ->
 * Ollama(free) -> fallback(trusted) ladder. The verifier gates EVERY tier, so no
 * tier's output is trusted unverified. Returns the verifiedOffload record extended
 * with { tier, source } and records the off-Claude telemetry into
 * byHook["ask-hermes"].
 *
 * @param {object} o
 * @param {(raw:any)=>boolean|{ok:boolean,value?:any}} o.verify  pure verifier (REQUIRED)
 * @param {()=>Promise<any>} o.fallback   trusted path (REQUIRED -- the floor)
 * @param {()=>Promise<any>} [o.hermesRun] strong-tier runner (injected; omit/tier!=strong to skip)
 * @param {()=>Promise<any>} [o.ollamaRun] free-tier runner (injected; omit to skip the local tier)
 * @param {'strong'|'local'} [o.tier='strong'] 'local' skips the Hermes tier
 * @param {string} [o.mode='ask']   telemetry mode tag (byMode split)
 * @param {string} [o.input='']     task text (for the tokens-saved estimate)
 * @param {(call:object)=>void} [o.record]  telemetry sink (injected for tests; default writes stats)
 * @param {string} [o.label]
 * @returns {Promise<{value:any, source:'hermes'|'ollama-fallback'|'kept', tier:string, verified:boolean, fellBack:boolean, reason:string}>}
 */
export async function verifiedTieredOffload({ verify, fallback, hermesRun, ollamaRun, tier = "strong", mode = "ask", input = "", record, label } = {}) {
  if (typeof verify !== "function") throw new TypeError("verifiedTieredOffload: verify must be a function");
  if (typeof fallback !== "function") throw new TypeError("verifiedTieredOffload: fallback is REQUIRED (no tiered auto-offload without a trusted fallback)");

  const sink = typeof record === "function" ? record : (call) => recordTieredUsage(call);
  const emit = (source, value) => {
    try {
      const offloaded = source === "hermes" || source === "ollama-fallback";
      const tokensSaved = offloaded
        ? estimateHermesSaved(input, typeof value === "string" ? value : JSON.stringify(value ?? ""))
        : 0;
      sink({ source, mode, tokensSaved });
    } catch { /* telemetry never breaks the offload */ }
  };

  // Tier 1 -- strong (Hermes). A SENTINEL fallback lets us detect "Hermes produced
  // no VERIFIED result" (threw / empty / verify-failed) without consuming the real
  // trusted fallback, so we can descend to the free tier instead.
  if (tier === "strong" && typeof hermesRun === "function") {
    const h = await verifiedOffload({ run: hermesRun, verify, fallback: async () => HERMES_FELLBACK, label });
    if (!h.fellBack) {
      emit("hermes", h.value);
      return { ...h, source: "hermes", tier: "strong" };
    }
    // else descend -- Hermes threw / was empty / failed the verifier
  }

  // Tier 2 -- free (Ollama) with the REAL trusted fallback as the floor.
  if (typeof ollamaRun === "function") {
    const o = await verifiedOffload({ run: ollamaRun, verify, fallback, label });
    if (!o.fellBack) {
      emit("ollama-fallback", o.value);
      return { ...o, source: "ollama-fallback", tier: "local" };
    }
    emit("kept", o.value);
    return { ...o, source: "kept", tier: "fallback" };
  }

  // No Ollama runner provided -- go straight to the trusted fallback (a fallback
  // throw propagates: the real path failing must surface, never be swallowed).
  const value = await fallback();
  emit("kept", value);
  return { value, source: "kept", verified: false, fellBack: true, reason: "no-ollama-runner", tier: "fallback", label };
}
