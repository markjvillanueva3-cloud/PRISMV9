#!/usr/bin/env node
// tier: T2
// tribal-by-domain-inject.mjs — UserPromptSubmit
//
// SYSTEM-VIZ-BRAIN-MS0/U-P1-TRIBAL-BY-DOMAIN-INJECT.
//
// Sibling of U-P1-WIKI-PRELOAD-BY-DOMAIN: the wiki-precheck-inject hook
// already biases wiki-entry ranking toward the active chat-slot's milestone
// domain (mill/lathe/wedm/cad/cam). This hook does the SAME for tribal
// knowledge — surfaces top-K tribal entries on every UserPromptSubmit,
// keyed on the slot's milestone domain (not just the prompt text).
//
// Reuses:
//   - getDomainTokens / chatIdFromInput from .claude/helpers/wiki-domain-bias.mjs
//   - .claude/scripts/tribal-rerank.mjs (Ollama-embed + cosine top-K, with
//     --domain doubling in-domain cosine scores)
//   - state/shared/tribal-embed-index.json (the L1 vector index)
//   - scripts/lib/lexical-rerank.mjs (RAG-UPGRADE-MS0/U-RAG-2 stage-2 lexical
//     reranker — pure, no model, sub-ms; safe inside this per-prompt hook)
//
// Two-stage retrieval (U-RAG-2): the cosine pass is stage 1 (recall — fetch
// STAGE1_K candidates); the lexical reranker is stage 2 (precision — re-score
// on exact-phrase / coverage / title-hit / density, narrow to TOP_K). The
// 2026 RAG research puts a careful reranker after the recall stage; a neural
// cross-encoder is the textbook stage 2 but is architecturally wrong inside a
// per-UserPromptSubmit hook, so the stage-2 reranker here is pure lexical.
//
// Advisory only — never blocks. Subprocess timeout caps latency. If Ollama
// is down or the index is missing, returns {continue:true} silently.
//
// Knobs:
//   PRISM_TRIBAL_DOMAIN_INJECT_DISABLE=1     no-op
//   PRISM_TRIBAL_DOMAIN_INJECT_K=N           top-K to inject (default 3)
//   PRISM_TRIBAL_DOMAIN_INJECT_TIMEOUT_MS=N  subprocess timeout (default 2500)
//   PRISM_TRIBAL_DOMAIN_INJECT_VERBOSE=1     log skip reasons to telemetry
//   PRISM_TRIBAL_DOMAIN_INJECT_THROTTLE_MS=N same-prompt re-inject throttle for
//                                            /loop ticks (default 60000; 0=off)
//   PRISM_ROOT                               repo root (default H:/prism)

import { spawnTribalRerank } from "../../scripts/lib/tribal-rerank-spawn.mjs";
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { getDomainTokens, chatIdFromInput, activeSlotName } from "../helpers/wiki-domain-bias.mjs";
import { rerank as lexicalRerank } from "../../scripts/lib/lexical-rerank.mjs";
// 2026-05-26 (U-D5-TRIBALINJECT-COUNTER-WIRE, slot:alpha): S6 shared counter for
// FEATURE-UTILIZATION dashboard. TribalInject feature was 0-fire pre-wire.
import { incrementFeature } from "../helpers/feature-counter.mjs";
// 2026-05-27 (U-CAG-INJECTORS-CONSUME, slot:sierra): biggest single CAG-route
// win — a 4s subprocess + Ollama embed for a COLD-tier prompt is pure burn.
// Fail-OPEN: every sidecar defect falls through to the regular rerank path.
import { shouldSkip, skipAdvisory } from "../helpers/cag-consume.mjs";
// U-TRIBAL-DOMAIN-THROTTLE (2026-06-10 slot:bravo): per-session same-prompt
// throttle so a /loop (which re-submits the IDENTICAL prompt every tick) does
// not re-run the rerank subprocess + Ollama embed + re-inject the same block
// each tick. Same proven lib + pattern as memory-index / master-index. Fail-open.
import { shouldThrottleInject } from "../../scripts/lib/inject-throttle.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const DISABLE = process.env.PRISM_TRIBAL_DOMAIN_INJECT_DISABLE === "1";
const TOP_K = Math.max(1, Math.min(10, parseInt(process.env.PRISM_TRIBAL_DOMAIN_INJECT_K || "3", 10) || 3));
// RAG-UPGRADE-MS0/U-RAG-2 — stage-1 (cosine) recall width. The cosine pass
// fetches STAGE1_K candidates; the lexical stage-2 (applyLexicalRerank)
// narrows to TOP_K. 5×TOP_K, clamped 20..50, is enough candidate breadth for
// the reranker without bloating the subprocess JSON payload or latency.
const STAGE1_K = Math.min(50, Math.max(20, TOP_K * 5));
const TIMEOUT_MS = Math.max(500, Math.min(15000, parseInt(process.env.PRISM_TRIBAL_DOMAIN_INJECT_TIMEOUT_MS || "2500", 10) || 2500));
const VERBOSE = process.env.PRISM_TRIBAL_DOMAIN_INJECT_VERBOSE === "1";
// Same-prompt re-inject throttle window (ms). 60s default mirrors the
// memory-index / master-index injectors; 0 disables (legacy always-inject).
// Parsed explicitly (NOT `parseInt(...) || 60000`) so an env "0" stays 0 = off
// rather than being coerced back to the default.
const THROTTLE_MS = (() => {
  const n = parseInt(process.env.PRISM_TRIBAL_DOMAIN_INJECT_THROTTLE_MS ?? "", 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(3600000, n)) : 60000;
})();
const TELEMETRY = path.join(PRISM_ROOT, "mcp-server", "data", "state", "hook-fire-counts.jsonl");
const RERANK_SCRIPT = path.join(PRISM_ROOT, ".claude", "scripts", "tribal-rerank.mjs");
const INDEX_PATH = path.join(PRISM_ROOT, "state", "shared", "tribal-embed-index.json");

const MIN_PROMPT_LEN = 4;
const MAX_PROMPT_LEN = 300;

// Token → tribal-rerank domain enum. **Declaration order is load-bearing.**
// First match wins, so put more-specific domains before more-general ones:
// "mill turning" → mill (mill listed first); "swiss cad" → swiss-class lathe
// machine, but `swiss` is parked under `lathe` because tribal-rerank accepts
// {mill,lathe,wedm,cad,cam,backend-dev,general}. Tokens cover the real PRISM
// milestone vocabulary as seen in `state/shared/atomic-roadmap.json`
// milestone slugs (mill/turn/wedm/cad/cam/swiss/5axis/grinder/sinker/pcd/etc).
// Fallback "general" if no tokens match — still useful, rerank returns top-K
// by cosine without the 2× in-domain boost.
//
// `backend-dev` is placed LAST (before fall-through to "general") so the 5
// manufacturing domains keep first-match-wins precedence. Backend-dev tokens
// are chosen to NOT overlap any manufacturing token set: a slot whose topic
// names a manufacturing milestone still routes to its physical domain, while
// pure dev slots (e.g. `BACKEND-DEV-LOOP`, `HOOK-SYNERGY-MS0`,
// `OLLAMA-PIPELINE-MS0`, `NN-GRAPH-MS0`, `COMMAND-KERNEL-MS0`,
// `SLOT-WORKTREE-MS0`) reach backend-dev. Wired 2026-05-18 lima
// (BACKEND-DEV-LOOP); see CLAUDE.md §"Recent regressions" + memory
// [[reference_backend_dev_tribal_wiring_2026_05_18]].
const DOMAIN_MAP = [
  { domain: "mill",  match: new Set(["mill", "milling", "kienzle", "endmill", "facemill", "spindle", "5axis", "fiveaxis", "grinder", "grinding", "drill", "drilling", "pocket", "chatter"]) },
  { domain: "lathe", match: new Set(["lathe", "turn", "turning", "okuma", "mazak", "groove", "thread", "swiss", "swisslike", "bar", "barfeed"]) },
  { domain: "wedm",  match: new Set(["wedm", "edm", "wire", "sodick", "mitsubishi", "agie", "charmilles", "sinker", "pcd", "ramwedm"]) },
  { domain: "cad",   match: new Set(["cad", "fusion", "inventor", "solidworks", "drawing", "blueprint", "ocr", "print", "catia", "step", "iges", "ipt", "iam"]) },
  { domain: "cam",   match: new Set(["cam", "mastercam", "hypermill", "esprit", "toolpath", "post", "solidcam", "powermill", "siemensnx", "feature"]) },
  { domain: "backend-dev", match: new Set([
    // milestone slugs that signal pure backend-dev work
    "backend", "devtool", "devtools", "kernel", "command", "synergy", "synerg",
    // harness / runtime infra
    "hook", "hooks", "slot", "fleet", "reaper", "scrutiny", "scrutin", "checkin",
    // LLM / Ollama tooling
    "ollama", "qwen", "nomic",
    // ML / neural / AI
    "lora", "gnn", "graphsage", "transformer", "neural", "llm", "embedding", "embed",
    "deep", "learning", "intelligence",
    // knowledge surfaces (purposely excludes `context` — too common as a
    // generic word and risks over-triggering on prompts about
    // "context-window/context-length")
    "tribal", "wiki", "knowledge",
    // coordination / distributed
    "consensus", "coordin", "coordinat", "distributed",
  ]) },
];

// Authoritative slot -> nearest VALID tribal-rerank domain (operator-canonical
// CHAT-SLOT-DOMAINS.md). Resolves the slot-token hijack: a topicless `slot/<name>`
// branch yields only the "slot" token, which is in the backend-dev set, so EVERY
// domain slot otherwise mis-routes to backend-dev. Values MUST stay within
// tribal-rerank's VALID_DOMAINS {mill,lathe,wedm,cad,cam,backend-dev,general}.
// Domains with no manufacturing-tribal corpus (business/quoting/academy/frontend)
// map to "general" (a broad-corpus hit beats a wrong-domain one). Unmapped slots
// fall through to the token heuristic (inferTribalDomain). U-TRIBAL-SLOT-DOMAIN-WIRE.
export const SLOT_TRIBAL_DOMAIN = {
  foxtrot: "mill", whiskey: "lathe", mike: "wedm", delta: "cad", kilo: "cam",
  oscar: "mill",        // speed-feed = cutting physics (nearest valid)
  echo: "cam",          // post-processor rides cam
  xray: "cad",          // blueprint-vision rides cad
  india: "backend-dev", // ai-training
  juliett: "backend-dev", // database = backend infra
  hotel: "general",     // business: no mfg-tribal corpus
  alpha: "backend-dev", bravo: "backend-dev", golf: "backend-dev", papa: "backend-dev",
  romeo: "backend-dev", sierra: "backend-dev", tango: "backend-dev", zebra: "backend-dev",
  charlie: "general", lima: "general", quebec: "general", november: "general",
};

function tele(decision, extra) {
  if (!VERBOSE && (decision === "skip_disabled" || decision === "skip_no_prompt")) return;
  try {
    appendFileSync(
      TELEMETRY,
      JSON.stringify({ ts: new Date().toISOString(), hook: "tribal-by-domain-inject", decision, ...extra }) + "\n",
      "utf8",
    );
  } catch { /* fail-safe */ }
}

function approve(out) {
  process.stdout.write(JSON.stringify({ continue: true, ...(out || {}) }));
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = readFileSync(0, "utf8");
    if (!raw || !raw.trim()) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// Pull the user prompt text from a UserPromptSubmit input. Defensive
// against shape variants — some harness versions pass `prompt` at top
// level, others nest inside hook_input or session. Uses own-property
// checks so a polluted prototype chain (Object.create or __proto__ smuggle)
// cannot inject a fake prompt. JSON.parse output always has own props, so
// this is a tightening with zero impact on the real-world harness path.
function ownStr(obj, key) {
  if (!obj || typeof obj !== "object") return null;
  if (!Object.prototype.hasOwnProperty.call(obj, key)) return null;
  const v = obj[key];
  return typeof v === "string" ? v : null;
}
export function extractPrompt(input) {
  if (!input || typeof input !== "object") return null;
  const p = ownStr(input, "prompt")
        || ownStr(input, "user_prompt")
        || ownStr(input.hook_input, "prompt")
        || ownStr(input.session, "prompt");
  if (typeof p !== "string") return null;
  const trimmed = p.trim().slice(0, MAX_PROMPT_LEN);
  return trimmed.length >= MIN_PROMPT_LEN ? trimmed : null;
}

// Map slot/milestone domain tokens to one of tribal-rerank's 6 domains.
// Returns the first matching domain; "general" if no tokens hit any set.
export function inferTribalDomain(domainTokens) {
  if (!Array.isArray(domainTokens) || !domainTokens.length) return "general";
  const tokenSet = new Set(domainTokens.map((t) => String(t).toLowerCase()));
  for (const { domain, match } of DOMAIN_MAP) {
    for (const t of tokenSet) {
      if (match.has(t)) return domain;
    }
  }
  return "general";
}

function runRerank(prompt, domain) {
  if (!existsSync(RERANK_SCRIPT)) return { ok: false, reason: "rerank_script_missing" };
  // Shard-aware existence gate: once the index grows past ~480 MiB it is rewritten
  // as a sibling .manifest.json + shard files and the monolith .json disappears
  // (write-tribal-index.mjs). The rerank's streamTribalEntries reads either layout,
  // so accept the manifest too -- gating on the monolith alone would return
  // index_missing post-shard and silently kill PSN leg #5 (U-TRIBAL-RERANK-STREAM
  // 2026-06-10; the growth this unblocks is exactly what triggers sharding).
  const manifestPath = INDEX_PATH.replace(/\.json$/i, "") + ".manifest.json";
  if (!existsSync(INDEX_PATH) && !existsSync(manifestPath)) return { ok: false, reason: "index_missing" };
  // Heap-safe spawn policy single-sourced in scripts/lib/tribal-rerank-spawn.mjs
  // (the 167MB index OOMs a default-heap child → silent PSN-leg-#5 death). Both
  // tribal injectors route through it so the heap/timeout config can't drift (R7).
  return spawnTribalRerank(
    [RERANK_SCRIPT, "--query", prompt, "--domain", domain, "--k", String(STAGE1_K), "--json", "--no-cite"],
    { timeoutMs: TIMEOUT_MS },
  );
}

// Parse the JSON output of tribal-rerank. Shape: { ok, query, domain, k, hits:[{score,source,title,...}] }
// We tolerate the older `results` field as an alias for `hits` since tribal-rerank's
// output shape has historically drifted.
//
// AUTO-INVOCATION-MS0/U-AIM02 (2026-05-16): filter `tip-auto-NNNN` entries.
// These are auto-ingested unfiltered tribal tips (the noise class flagged by
// the user observation 2026-05-16 — "tip-auto-5033", "tip-auto-5081" etc.
// showing up as wiki precheck hits despite zero curation). The underlying
// tribal-embed-index still contains them so the rerank can compete fairly;
// we just suppress them at the inject seam. Knob:
// PRISM_TRIBAL_INCLUDE_AUTO=1 to disable the filter.
const TIP_AUTO_RE = /\btip-auto-/i;
function isAutoIngestedNoise(h) {
  if (process.env.PRISM_TRIBAL_INCLUDE_AUTO === "1") return false;
  const id = String(h.id || "");
  const title = String(h.title || "");
  const source = String(h.source || h.path || "");
  return TIP_AUTO_RE.test(id) || TIP_AUTO_RE.test(title) || TIP_AUTO_RE.test(source);
}

export function parseRerankOutput(stdout, topK) {
  if (!stdout || typeof stdout !== "string") return [];
  let j;
  try { j = JSON.parse(stdout); } catch { return []; }
  const arr = Array.isArray(j.hits) ? j.hits : (Array.isArray(j.results) ? j.results : []);
  return arr
    .filter((h) => !isAutoIngestedNoise(h))
    .slice(0, topK)
    .map((h) => ({
      score: typeof h.score === "number" ? h.score : 0,
      source: h.source || h.path || "tribal",
      title: h.title || h.id || "(untitled)",
      snippet: typeof h.text === "string" ? h.text.slice(0, 140) : "",
    }));
}

/**
 * RAG-UPGRADE-MS0/U-RAG-2 — two-stage retrieval, stage 2.
 *
 * Re-rank the cosine (stage-1) candidates with the pure lexical reranker and
 * narrow to topK. The cosine pass is recall-oriented — it surfaces what is
 * semantically near. This stage lifts what the embedding underweights: exact
 * query-phrase hits, full term coverage, a title/label match, term density.
 * It is pure (no model, no network, sub-millisecond) so it is safe inside a
 * per-UserPromptSubmit hook where a cross-encoder call would not be.
 *
 * The cosine hit shape `{score,source,title,snippet}` is mapped onto the
 * reranker's candidate contract: `text` ← snippet (coverage/phrase/density
 * signal), `label` ← title (labelHit signal), `score` carried as the stage1
 * feature. The trailing `.slice(0, topK)` is defensive — `rerank` degrades
 * gracefully to an unsliced copy on a blank / all-stopword query, and this
 * hook must never inject more than topK hits regardless of that path.
 */
export function applyLexicalRerank(prompt, hits, topK) {
  if (!Array.isArray(hits)) return [];
  if (hits.length <= 1) return hits.slice(0, topK);
  const cands = hits.map((h) => ({ ...h, text: h.snippet || "", label: h.title || "" }));
  const ranked = lexicalRerank(prompt, cands, { topK }).slice(0, topK);
  // Drop the text/label fields added only as reranker-scoring inputs — return
  // the clean cosine hit shape {score,source,title,snippet} formatInjection wants.
  return ranked.map((c) => ({ score: c.score, source: c.source, title: c.title, snippet: c.snippet }));
}

export function formatInjection(hits, domain) {
  if (!hits.length) return null;
  const header = `## 🧠 Tribal-by-domain precontext — ${hits.length} hit(s) in \`${domain}\``;
  const body = hits.map((h, i) => {
    const s = h.score.toFixed(2);
    const snip = h.snippet ? ` — ${h.snippet}` : "";
    return `${i + 1}. [${s} · ${h.source}] **${h.title}**${snip}`;
  }).join("\n");
  const footer = "_Domain inferred from active chat-slot's milestone. Adapter: `tribal-rerank.mjs`. Disable: `PRISM_TRIBAL_DOMAIN_INJECT_DISABLE=1`._";
  return `${header}\n${body}\n${footer}`;
}

function buildOutput(additionalContext) {
  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext,
    },
  };
}

async function main(injected) {
  if (DISABLE) { tele("skip_disabled"); approve(); return; }
  const input = injected !== undefined ? injected : readStdin();
  const prompt = extractPrompt(input);
  if (!prompt) { tele("skip_no_prompt"); approve(); return; }
  // U-CAG-INJECTORS-CONSUME (2026-05-27, sierra): biggest single CAG win — the
  // tribal-rerank subprocess + Ollama embed costs ~3-4s + ~2KB on every
  // UserPromptSubmit. For COLD-tier prompts answered by cached doctrine, skip.
  // Fail-OPEN: every sidecar defect falls through. Read session_id off the same
  // raw input as extractPrompt — defensive against nested-shape variants.
  //
  // P2 follow-up (scrutiny arm C, same-day): accept BOTH `session_id` (harness
  // canonical) AND `sessionId` (camelCase variant some test/SDK paths emit) to
  // mirror master-index-precheck-inject's tolerant pattern. Avoids a silent
  // full-rerank-on-COLD-prompt class if the harness shape ever drifts.
  const sessionId = (input && typeof input === "object")
    ? (typeof input.session_id === "string" ? input.session_id
       : typeof input.sessionId === "string" ? input.sessionId
       : "")
    : "";
  // U-TRIBAL-DOMAIN-THROTTLE: identical prompt+session within the TTL => skip the
  // whole path (a /loop re-submits the same prompt every tick). Placed BEFORE the
  // CAG read AND the rerank subprocess + Ollama embed, so a suppressed tick does
  // ZERO work and emits nothing. Fail-open (no sid / ttl<=0 / I/O error => proceed).
  if (shouldThrottleInject({ sessionId, prompt, nowMs: Date.now(), ttlMs: THROTTLE_MS })) {
    tele("skip_throttled", { ttlMs: THROTTLE_MS });
    approve();
    return;
  }
  const cag = shouldSkip("tribalByDomainInject", { sessionId });
  if (cag.skip) {
    tele("skip_cag_cold", { tier: cag.tier, confidence: cag.confidence });
    approve(buildOutput(skipAdvisory("Tribal-by-domain precontext", cag)));
    return;
  }
  const chatId = chatIdFromInput(input);
  // Authoritative slot->domain FIRST (U-TRIBAL-SLOT-DOMAIN-WIRE): map the active
  // slot to its canonical tribal-rerank domain, resolving the slot-token hijack.
  // Fall back to the token heuristic for unmapped slots.
  const slotName = activeSlotName(chatId);
  const slotDomain = slotName ? SLOT_TRIBAL_DOMAIN[slotName] : undefined;
  const domain = slotDomain || inferTribalDomain(getDomainTokens({ chatId }));
  const result = runRerank(prompt, domain);
  if (!result.ok) { tele("noop", { reason: result.reason, domain }); approve(); return; }
  // U-D5: feature engaged — tribal rerank ran successfully for the domain.
  try { incrementFeature("TribalInject", { slot: null }); } catch { /* never blocks */ }
  // Stage 1 — parse the cosine recall set (up to STAGE1_K wide).
  const stage1 = parseRerankOutput(result.stdout, STAGE1_K);
  if (!stage1.length) { tele("no_hits", { domain }); approve(); return; }
  // Stage 2 (U-RAG-2) — lexical rerank narrows STAGE1_K → TOP_K.
  const hits = applyLexicalRerank(prompt, stage1, TOP_K);
  tele("injected", { domain, hits: hits.length, stage1: stage1.length, chatId: chatId || "unknown" });
  approve(buildOutput(formatInjection(hits, domain)));
}

export { main };

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch(() => approve());
}
