#!/usr/bin/env node
// tier: T3
// ollama-nav-enforce-inject.mjs -- UserPromptSubmit advisory hook
//
// The directive (operator 2026-06-09): "enforce using ollama for searches,
// reads, navigating the codebase ... assuming we get no loss of quality."
//
// PRISM already HAS the capability -- scripts/ollama-prism-bridge.mjs is an
// agentic harness that lets a LOCAL Ollama model chain seven read-only PRISM
// tools (viz_search/wiki_lookup/read_excerpt/obsidian_lookup/dispatcher_map/
// semantic_search/mcp_call) to answer a multi-step "where is X / how does Y
// work / what wires to Z" investigation at ~0 Claude tokens. But it is
// DORMANT: route-savings take-rate ~0.4%, ollama-offload ~7% vs the 30%
// target. The /ollama-bridge skill has triggers but is NOT in INVOKE_NOW, so
// skill-auto-trigger only emits a generic low-salience suggest.
//
// This hook is the dedicated, high-salience, MEASURED enforcement sibling of
// wiki-read-offload-advisory.mjs (the READ sibling; this is the NAV sibling).
// It fires ONLY on high-confidence codebase-navigation intent -- a nav-verb
// AND a codebase-noun must BOTH appear -- so a domain question ("how does a
// lathe work") never fires, only a codebase question ("how does the slot-claim
// system work, which files"). It injects the ready-to-run bridge invocation so
// the navigation routes to the local LLM instead of a Grep+Read+Grep chain in
// Claude context.
//
// Honest scope (R12): ADVISORY, never a hard block -- the directive says "no
// loss of quality", and a hard block on search/read would force a worse local
// answer where Claude needs the real bytes (e.g. an edit). Claude/operator
// decides on the next turn. The saving banks only when the bridge is run;
// tracked under offload-stats byHook["ollama-nav-enforce"].suggested so the
// 7%->30% climb is measurable.
//
// Per-session, per-question dedup via session-once-gate so the identical
// suggestion is not re-injected every prompt (which would itself waste the
// context this hook exists to save).
//
// Knobs:
//   PRISM_OLLAMA_NAV_ENFORCE_DISABLE=1   -- off-switch (fail-safe: prompt continues)
//   PRISM_OLLAMA_NAV_ENFORCE_VERBOSE=1   -- debug stderr
//
// Wiring: UserPromptSubmit (individual settings.json entry, NOT a bundle --
// bundles are high-contention peer-claimed real-estate; per the master-index
// wiring lesson). Stays out of bravo's engine-routing surface (U3-U7):
// ModelRoutingEngine / ask-ollama DEFAULT_MODEL / OllamaHookBridgeEngine.

import { readFileSync, existsSync, writeFileSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { seenThisSession, markSeenThisSession } from "../../scripts/lib/session-once-gate.mjs";
import { decayDecision } from "../../scripts/lib/advisory-decay.mjs";

export const HOOK_KEY = "ollama-nav-enforce";
export const STATS_PATH = "H:/prism/mcp-server/data/state/ollama-offload-stats.json";
export const SEEN_PATH = "H:/prism/mcp-server/data/state/ollama-nav-enforce-seen.json";

// A prompt longer than this is almost always a goal/directive/spec paste, not a
// focused navigation question -- skip it (the operator's standing /goal text
// itself contains "navigating the codebase" and must NOT self-trigger).
export const MAX_PROMPT_CHARS = 1200;
// Question text is capped before it goes into the suggested command line.
export const MAX_QUESTION_CHARS = 200;

// Nav-verbs: multi-step investigation signals. Word-boundary anchored so
// "trace" matches "trace the" but not "retraced". Phrases ("where is") are
// matched whole.
const NAV_VERB_RE =
  /\b(where (is|are|does|do)|where's|how (does|do)|what (wires|calls|uses|invokes|consumes|reads)|wires? to|wired to|which files?|what files?|find all|find where|trace through|trace the|locate the|navigate the)\b/;

// Codebase-nouns: confirm the question is about THE CODE, not a manufacturing
// domain. One must co-occur with a nav-verb to fire.
const CODEBASE_NOUN_RE =
  /\b(engines?|dispatchers?|hooks?|skills?|functions?|files?|modules?|class(es)?|scripts?|actions?|schemas?|imports?|exports?|codebase|implementation|computed|defined|handlers?|pipelines?|registr(y|ies)|wired|wiring|methods?|helpers?|endpoints?|routes?|repo)\b/;

// A source-file extension is itself a strong codebase signal (e.g. "what calls
// foo.ts"). Matched separately because \b around a dot is unreliable.
const CODE_EXT_RE = /\.(ts|tsx|mjs|cjs|js|jsx|py)\b/;

// The prompt already points at the local-LLM offload path -- do not nudge what
// it is already doing.
const ALREADY_ROUTING_RE = /ollama-prism-bridge|\/ollama-bridge|ask-ollama|ask-local/;

/**
 * Classify a prompt as a codebase-navigation question. Pure.
 * Returns { isNav:true, verb, noun, question } on a high-confidence match, or
 * { isNav:false, reason } otherwise. The gate is deliberately conservative
 * (verb AND noun) so it never fires on a manufacturing-domain question.
 */
export function classifyNavIntent(prompt) {
  if (!prompt || typeof prompt !== "string") return { isNav: false, reason: "empty-or-nonstring" };
  const trimmed = prompt.trim();
  if (!trimmed) return { isNav: false, reason: "blank" };
  if (trimmed.startsWith("/")) return { isNav: false, reason: "slash-command" };
  if (trimmed.length > MAX_PROMPT_CHARS) return { isNav: false, reason: "too-long-directive-paste" };
  const lc = trimmed.toLowerCase();
  if (ALREADY_ROUTING_RE.test(lc)) return { isNav: false, reason: "already-routing-to-ollama" };
  const verbM = lc.match(NAV_VERB_RE);
  if (!verbM) return { isNav: false, reason: "no-nav-verb" };
  const nounM = lc.match(CODEBASE_NOUN_RE);
  const extM = lc.match(CODE_EXT_RE);
  if (!nounM && !extM) return { isNav: false, reason: "no-codebase-noun" };
  return {
    isNav: true,
    verb: verbM[0],
    noun: (nounM && nounM[0]) || (extM && extM[0]) || "",
    question: trimmed,
  };
}

/**
 * Sanitize a question for safe inclusion inside a double-quoted shell command:
 * collapse whitespace/newlines, drop double-quotes + backticks + $, cap length.
 * Pure.
 */
export function sanitizeForCommand(question) {
  const oneLine = String(question == null ? "" : question).replace(/\s+/g, " ").trim();
  const stripped = oneLine.replace(/["`$\\]/g, "'");
  if (stripped.length <= MAX_QUESTION_CHARS) return stripped;
  return stripped.slice(0, MAX_QUESTION_CHARS) + "...";
}

/**
 * A short, stable dedup key for a navigation question so the SAME question does
 * not re-inject within a session (different questions still fire). Pure.
 * djb2 over the normalized lowercased question -- collision-tolerant by design
 * (a rare collision just suppresses one distinct suggestion, never a safety
 * issue).
 */
export function navQuestionKey(question) {
  const norm = String(question == null ? "" : question).replace(/\s+/g, " ").trim().toLowerCase();
  let h = 5381;
  for (let i = 0; i < norm.length; i++) {
    h = ((h << 5) + h + norm.charCodeAt(i)) | 0; // h*33 + c, kept in int32
  }
  return `nav:${(h >>> 0).toString(36)}`;
}

// The bridge's default model (qwen2.5-coder:32b) does NOT reliably emit native
// Ollama tool-calls -- it returns the tool-call as plain text, so the agent loop
// executes 0 tools and the bridge returns garbage (live-verified 2026-06-09).
// A resident REASONING model with native tool support drives it correctly
// (gpt-oss:20b chained 4 real tools in the same probe). So the suggested command
// pins a tool-capable model -- otherwise routing here would LOSE quality, which
// the directive forbids. Root fix = the bridge's DEFAULT_MODEL (bravo's U5b
// "ollama-prism-bridge native tool-calling"); once that lands this flag is a
// harmless no-op. Override per-host: PRISM_OLLAMA_NAV_BRIDGE_MODEL.
export const BRIDGE_TOOL_MODEL = process.env.PRISM_OLLAMA_NAV_BRIDGE_MODEL || "gpt-oss:20b";

/**
 * Build the advisory directive string injected into the prompt context. Pure.
 */
export function buildNavSuggestion(classification) {
  const cmd = `node scripts/ollama-prism-bridge.mjs --model ${BRIDGE_TOOL_MODEL} "${sanitizeForCommand(classification.question)}"`;
  return [
    `[ollama-nav] codebase-navigation intent detected ("${classification.verb}" + "${classification.noun}").`,
    `Route this multi-step investigation to the LOCAL Ollama bridge -- ~0 Claude tokens, no quality loss:`,
    `   ${cmd}`,
    `The bridge chains read-only viz_search / wiki_lookup / read_excerpt / semantic_search /`,
    `dispatcher_map / mcp_call tools on a local model and returns only the answer -- prefer it`,
    `over a Grep+Read+Grep chain in Claude context. (skill: /ollama-bridge; disable: PRISM_OLLAMA_NAV_ENFORCE_DISABLE=1)`,
  ].join("\n");
}

// ---- side-effect: bump offload-stats byHook.<key>.suggested (atomic) ----
// Best-effort: any read/write failure is swallowed (fail-safe -- the advisory
// already injected). Atomic temp+rename avoids corrupting the stats file under
// concurrent fleet writes. Mirrors wiki-read-offload-advisory.bumpStats.
function bumpStats() {
  try {
    if (!existsSync(STATS_PATH)) return;
    const raw = readFileSync(STATS_PATH, "utf8");
    let j;
    try { j = JSON.parse(raw); } catch { return; }
    if (!j || typeof j !== "object") return;
    j.byHook = j.byHook || {};
    j.byHook[HOOK_KEY] = j.byHook[HOOK_KEY] || { fired: 0, offloaded: 0, kept: 0, suggested: 0, tokensSaved: 0 };
    const h = j.byHook[HOOK_KEY];
    h.fired = (h.fired | 0) + 1;
    h.suggested = (h.suggested | 0) + 1;
    j.silentSuggestions = (j.silentSuggestions | 0) + 1;
    j.lastUpdated = new Date().toISOString();
    const tmp = `${STATS_PATH}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, JSON.stringify(j, null, 2));
    renameSync(tmp, STATS_PATH);
  } catch { /* fail-safe */ }
}

// ---- impure shell ----
async function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    let done = false;
    const finish = (s) => { if (!done) { done = true; resolve(s); } };
    if (process.stdin.isTTY) return finish("");
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => { buf += c; if (buf.length > 1024 * 256) finish(buf); });
    process.stdin.on("end", () => finish(buf));
    process.stdin.on("error", () => finish(buf));
    setTimeout(() => finish(buf), 750);
  });
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

async function main() {
  if (process.env.PRISM_OLLAMA_NAV_ENFORCE_DISABLE === "1") {
    emit({ continue: true, suppressOutput: true });
    return 0;
  }
  const verbose = process.env.PRISM_OLLAMA_NAV_ENFORCE_VERBOSE === "1";

  const raw = await readStdin();
  let payload;
  try { payload = raw ? JSON.parse(raw) : {}; } catch { emit({ continue: true }); return 0; }

  const prompt = payload.prompt || payload.user_prompt || "";
  const sessionId = payload.session_id || payload.sessionId || "";

  const classification = classifyNavIntent(prompt);
  if (!classification.isNav) {
    if (verbose) process.stderr.write(`ollama-nav-enforce: skip (${classification.reason})\n`);
    emit({ continue: true });
    return 0;
  }

  // Per-session, per-question dedup: same nav question -> inject once. Fail-soft
  // (a missing session_id degrades to "not seen" -> the suggestion fires).
  const key = navQuestionKey(classification.question);
  if (seenThisSession(SEEN_PATH, sessionId, key)) {
    if (verbose) process.stderr.write(`ollama-nav-enforce: skip (already-suggested this session: ${key})\n`);
    emit({ continue: true });
    return 0;
  }
  markSeenThisSession(SEEN_PATH, sessionId, key);

  bumpStats(); // unconditional: records the fire BEFORE the decay gate so the
               // epsilon-probe counter (byHook.suggested) always advances --
               // a muted hook must keep sampling or the mute becomes a kill.

  // advisory-decay gate (U-ADVISORY-DECAY): if this hook has degraded to proven
  // noise (>= 50 injections at < 5% take-rate) suppress the advisory to save
  // context tokens. Fail-safe: anything but confirmed-noise-off-probe fires.
  // Today nav-enforce is insufficient-data (< 50 injections) -> always fires;
  // this arms it so it self-mutes if it ever degrades. (offloaded IS the right
  // success metric for a nav-offload advisory.)
  const decay = decayDecision(HOOK_KEY, { statsPath: STATS_PATH });
  if (!decay.fire) {
    if (verbose) process.stderr.write(`ollama-nav-enforce: muted (${decay.reason}, take=${decay.takeRate})\n`);
    emit({ continue: true });
    return 0;
  }
  if (verbose) process.stderr.write(`ollama-nav-enforce: advise ("${classification.verb}"+"${classification.noun}", ${key})\n`);

  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: buildNavSuggestion(classification),
    },
  });
  return 0;
}

// CLI entry guard -- `import` of pure fns must NOT execute main().
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((c) => process.exit(c || 0)).catch((e) => {
    try { process.stderr.write(`ollama-nav-enforce fatal: ${e.message}\n`); } catch {}
    emit({ continue: true });
    process.exit(0);
  });
}
