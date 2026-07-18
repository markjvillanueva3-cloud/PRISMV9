#!/usr/bin/env node
// tier: T2
// memory-index-precheck-inject.mjs — UserPromptSubmit injector (T2, advisory).
//
// H7 of [[audit-system-synergy-2026-05-09]]: surfaces top-K direct hits over
// the Obsidian memory vault (~492 files at audit time) when a user prompt
// has 2+ content tokens. Closes the gap left by master-index-precheck-inject
// (system-graph node search; only finds memories pre-joined to nodes) and
// memory-relevance-inject (PreToolUse:Edit-only; derives terms from file
// path, not user prompt).
//
// Reads H:/prism/knowledge/memories/{feedback,reference,project,user,...}/
// directly via the pure-core lib. Tokenizer + stopwords match
// master-index-search-lib (search semantics blend predictably).
//
// Always exit 0 (advisory). Never blocks the prompt. Per-session prompt-hash
// throttle (default 60s — re-asking the same question within 60s skips
// re-injection to avoid context burn on /loop ticks). Implemented via
// scripts/lib/inject-throttle.mjs (per-session state, fail-open).
//
// Knobs:
//   PRISM_MEMORY_INDEX_INJECT=0       — off entirely
//   PRISM_MEMORY_INDEX_K=N            — top-K hits (default 3, bounded 1..10)
//   PRISM_MEMORY_INDEX_MIN_TOKENS=N   — min content tokens to fire (default 2)
//   PRISM_MEMORY_INDEX_THROTTLE_MS=N  — same-prompt re-inject throttle (default 60000; 0=off)
//   PRISM_MEMORY_DOMAIN_BOOST=0       — disable per-galaxy domain boost (default on)

import { readFileSync } from "node:fs";
import { runMemoryIndexSearch } from "../../scripts/lib/memory-index-search-lib.mjs";
import { galaxyForSlot } from "../../scripts/lib/slot-galaxy-map.mjs";
import { shouldThrottleInject } from "../../scripts/lib/inject-throttle.mjs";
import { shouldSkip, skipAdvisory } from "../helpers/cag-consume.mjs";
// Fire-counter (OBSIDIAN-RECALL-MEASURE, 2026-06-09): records each real
// injection into state/shared/dashboards/feature-util-counts.json so the
// take-rate audit can later weigh this recall surface's cost vs its value
// (operator directive "flip ON + measure take-rate"). Best-effort, never blocks.
import { incrementFeature } from "../helpers/feature-counter.mjs";

const ENABLED = process.env.PRISM_MEMORY_INDEX_INJECT !== "0";
const MIN_TOKENS = clampInt(process.env.PRISM_MEMORY_INDEX_MIN_TOKENS, 2, 1, 8);
const TOP_K = clampInt(process.env.PRISM_MEMORY_INDEX_K, 3, 1, 10);
const THROTTLE_MS = clampInt(process.env.PRISM_MEMORY_INDEX_THROTTLE_MS, 60000, 0, 3600000);
const MAX_PROMPT_LEN = 4000;

// MEMORY-RECALL-DOMAIN-BOOST (2026-06-01 slot:golf): when this chat is bound to a
// fleet slot (PRISM_BOOT_SLOT, set by slot-tab-boot.ps1), bias recall toward that
// slot's own galaxy brain so each domain keeps its primary context. Additive +
// relevance-gated in the lib — never suppresses cross-domain hits. Graceful: no
// slot / unmapped slot / disabled => no boost (legacy behavior).
const DOMAIN_BOOST_ON = process.env.PRISM_MEMORY_DOMAIN_BOOST !== "0";
function resolveBoostDomain() {
  if (!DOMAIN_BOOST_ON) return null;
  const slot = String(process.env.PRISM_BOOT_SLOT || "").trim().toLowerCase();
  if (!slot) return null;
  return galaxyForSlot(slot);   // null when the slot has no galaxy (november/yankee)
}

function clampInt(raw, fallback, min, max) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function readStdinSync() {
  try { return readFileSync(0, "utf8"); }
  catch { return ""; }
}

function emit(additionalContext) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext,
    },
  }));
}

// HMEMV02 explainable retrieval: compact "why retrieved" tag. Default OFF (the recall
// block fires every prompt across 26 slots; adding tokens fleet-wide by default is a
// budget cost). PRISM_MEMORY_INDEX_EXPLAIN=1 surfaces which arm produced each hit
// (qdrant/scan dense + cosine, or bm25-only) + BM25 component + matched tokens, so an
// operator can audit WHY a memo surfaced. The lib always returns the data; this only
// controls rendering.
const EXPLAIN_ON = process.env.PRISM_MEMORY_INDEX_EXPLAIN === "1";
function explainTag(h) {
  if (!EXPLAIN_ON) return "";
  const e = h && h.explanation;
  if (!e) return "";
  const arm = e.denseArm
    ? `${e.denseArm}${typeof e.denseSim === "number" ? " " + e.denseSim.toFixed(2) : ""}`
    : "bm25";
  const bm = typeof e.bm25Score === "number" ? ` bm25:${e.bm25Score.toFixed(1)}` : "";
  const mt = Array.isArray(e.matchedTokens) && e.matchedTokens.length ? ` matched:${e.matchedTokens.join("/")}` : "";
  return ` [via ${arm}${bm}${mt}]`;
}

function renderBlock(tokens, hits, boostDomain) {
  const lines = hits.map((h) => {
    const desc = h.description ? ` — ${h.description.slice(0, 120)}` : "";
    return `  • [${h.namespace}] [[${h.name}]] (score: ${h.score.toFixed(1)})${explainTag(h)}${desc}`;
  });
  const domainNote = boostDomain ? `\n_Domain-boosted for slot galaxy: **${boostDomain}**._` : "";
  return `## 🧠 Memory vault pre-search (top ${hits.length} direct hits)${domainNote}
Query tokens: ${tokens.join(", ")}

${lines.join("\n")}

_Source: knowledge/memories/{feedback,reference,project,user,patterns,mistakes,inbox}/_
_To disable: \`PRISM_MEMORY_INDEX_INJECT=0\` · Tune K: \`PRISM_MEMORY_INDEX_K=N\`._`;
}

function main() {
  if (!ENABLED) { process.exit(0); }

  let payload;
  try { payload = JSON.parse(readStdinSync() || "{}"); }
  catch { process.exit(0); }

  const prompt = String(payload.prompt ?? "").slice(0, MAX_PROMPT_LEN);
  if (!prompt || prompt.length < 6) { process.exit(0); }

  // Per-session same-prompt throttle: a /loop re-submits the SAME prompt each
  // tick — without this we re-inject an identical block every tick (context burn).
  const sessionId = payload.session_id || payload.sessionId || "";
  if (shouldThrottleInject({ sessionId, prompt, nowMs: Date.now(), ttlMs: THROTTLE_MS })) {
    process.exit(0);
  }

  // CAG cold-tier skip (SUBSTRATE-UTIL Gap 3 -- parity with master-index-precheck:193 +
  // tribal-by-domain-inject:340). When the CAG router classified this prompt as not needing
  // memory retrieval (skip.memoryRelevanceInject), honor it BEFORE the search instead of
  // re-running runMemoryIndexSearch + re-injecting. This injector was the ONE retrieval hook
  // missing the skip-consume its 2 siblings already had -> a cold prompt still paid for memory
  // retrieval here while master-index/tribal correctly skipped. Fail-soft: shouldSkip returns
  // {skip:false} on a missing/stale/non-skippable sidecar, so the default path is unchanged.
  const cag = shouldSkip("memoryRelevanceInject", { sessionId });
  if (cag.skip) {
    emit(skipAdvisory("Memory-index precheck", cag));
    process.exit(0);
  }

  const boostDomain = resolveBoostDomain();
  const { tokens, hits } = runMemoryIndexSearch(prompt, { topK: TOP_K, boostDomain });
  if (tokens.length < MIN_TOKENS) { process.exit(0); }
  if (hits.length === 0) { process.exit(0); }

  try { incrementFeature("MemoryIndexInject", { domain: boostDomain ?? null }); } catch { /* never blocks */ }
  emit(renderBlock(tokens, hits, boostDomain));
  process.exit(0);
}

try { main(); }
catch (err) {
  try { process.stderr.write(`[memory-index-precheck-inject] ${err?.message || err}\n`); }
  catch { /* ignore */ }
  process.exit(0);
}
