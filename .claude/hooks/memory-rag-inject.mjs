#!/usr/bin/env node
// tier: T2
/**
 * memory-rag-inject.mjs — UserPromptSubmit hook
 *
 * When the user prompt contains memory-recall keywords (remember, recall,
 * previous, last time, earlier, prior, before, context from), surface the
 * most relevant entries from the H-drive vault (knowledge/memories/) and
 * inject them as additional context.
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0 / P3-U05.
 *
 * 2026-06-04 (slot:alpha, TOKEN-SAVINGS rank-7 — memory-injector-dedup):
 *   RETIRED the cmd.exe -> tsx -> temp-.mts subprocess. The engine it shelled
 *   out to (`obsidianMemoryRagEngine` at mcp-server/{src,dist}/engines/
 *   ObsidianMemoryRagEngine.{ts,js}) NEVER EXISTED in this tree — no source, no
 *   dist build, no git history. Both the dist-import path and the tsx-subprocess
 *   path therefore always returned null, so this hook was a dead no-op that, on
 *   the rare keyword hit, still paid the cost of writing a temp .mts and
 *   attempting to spawn cmd.exe. We now call the shared pure-core search lib
 *   `scripts/lib/memory-index-search-lib.mjs:runMemoryIndexSearch()` — the SAME
 *   lib that backs memory-index-precheck-inject.mjs and scans the identical
 *   knowledge/memories/ vault. In-process, synchronous, sidecar-fast, zero spawn.
 *   See [[reference_memory_rag_keyword_triggers]].
 *
 * DEDUP vs memory-index-precheck-inject.mjs: that sibling injects a memory-vault
 *   block on ESSENTIALLY EVERY prompt (>=2 content tokens). When it is enabled
 *   (PRISM_MEMORY_INDEX_INJECT != "0", the default) it already covers any
 *   recall-keyword prompt, so this hook would render a near-identical second
 *   block — pure context burn. We therefore DEFER to the precheck injector when
 *   it is active and the prompt has enough content tokens for it to fire. This
 *   hook then only adds value as a FALLBACK recall surface when the precheck
 *   injector is disabled. A distinct header makes the two outputs non-identical
 *   on the rare path where this one does fire.
 *
 * Wired via H:/.claude/settings.json under the UserPromptSubmit hooks list.
 *
 * Failure mode: never blocks the user prompt. On any error, emits
 * `{continue: true}` and exits 0. The hook is read-only: pure scan of vault
 * entries already on disk (no LLM calls, no Qdrant, no subprocess).
 *
 * Skip cases:
 *   - PRISM_MEMORY_RAG_DISABLED=1 (escape hatch)
 *   - prompt has no memory-recall keyword (no injection, but no block)
 *   - memory-index-precheck-inject is active and would cover this prompt (dedup)
 *   - no vault hits (silent skip)
 *
 * Output:
 *   Claude Code's hookSpecificOutput.additionalContext is the inject surface
 *   for UserPromptSubmit. We render the top-K excerpts as markdown there so they
 *   appear above the user prompt in the conversation context.
 */

import { readFileSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runMemoryIndexSearch } from "../../scripts/lib/memory-index-search-lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = "H:/prism/state/shared/memory-rag-inject.log";
const HOOK_TIMEOUT_MS = 4_000; // total budget for the hook

// Recall keywords — the defining gate for this hook (vs the always-on precheck
// injector). Kept here, not in an engine: the engine never existed, and the
// canonical list lives in [[reference_memory_rag_keyword_triggers]]. Narrow on
// purpose — widening it makes every prompt pay a vault-scan cost.
const RECALL_KEYWORDS = [
  "remember",
  "recall",
  "previous",
  "last time",
  "earlier",
  "prior",
  "before",
  "context from",
];

// Top-K excerpts to surface; bounded like the precheck injector.
function clampInt(raw, fallback, min, max) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
const TOP_K = clampInt(process.env.PRISM_MEMORY_RAG_K, 3, 1, 10);
// Min content tokens the precheck injector requires to fire — mirror it so the
// dedup deferral matches the precheck's own gate exactly (default 2).
const PRECHECK_MIN_TOKENS = clampInt(process.env.PRISM_MEMORY_INDEX_MIN_TOKENS, 2, 1, 8);

function log(line) {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`, "utf-8");
  } catch { /* best-effort */ }
}

function emitContinue(additionalContext) {
  try {
    const payload = additionalContext
      ? { continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext } }
      : { continue: true };
    process.stdout.write(JSON.stringify(payload));
  } catch { /* swallow */ }
}

async function readStdin() {
  return await new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 200); // 200ms cap on stdin read
  });
}

function extractPrompt(payload) {
  if (typeof payload?.prompt === "string") return payload.prompt;
  if (typeof payload?.user_prompt === "string") return payload.user_prompt;
  if (typeof payload?.message === "string") return payload.message;
  return null;
}

// Recall-keyword gate (case-insensitive substring match). Pure + exported for tests.
export function hasRecallKeyword(prompt) {
  if (typeof prompt !== "string" || prompt.length === 0) return false;
  const lower = prompt.toLowerCase();
  return RECALL_KEYWORDS.some((k) => lower.includes(k));
}

// Dedup gate: the precheck injector (memory-index-precheck-inject.mjs) injects a
// memory-vault block on essentially every prompt with >=PRECHECK_MIN_TOKENS
// content tokens. When it is enabled it already covers this prompt, so we DEFER
// to avoid a near-duplicate second block. Returns true => this hook should skip.
// Pure + exported for tests.
export function precheckCoversPrompt(tokenCount, env = process.env) {
  const precheckEnabled = env.PRISM_MEMORY_INDEX_INJECT !== "0";
  if (!precheckEnabled) return false;
  const minTokens = clampInt(env.PRISM_MEMORY_INDEX_MIN_TOKENS, 2, 1, 8);
  return tokenCount >= minTokens;
}

// Render the recall block. Distinct header from the precheck injector so the two
// outputs are never byte-identical on the fallback path. Pure + exported for tests.
export function renderRecallBlock(tokens, hits) {
  const lines = hits.map((h) => {
    const desc = h.description ? ` — ${String(h.description).slice(0, 120)}` : "";
    return `  • [${h.namespace}] [[${h.name}]] (score: ${Number(h.score).toFixed(1)})${desc}`;
  });
  return `## 🧠 Memory recall (top ${hits.length} vault hits for your recall keyword)
Query tokens: ${tokens.join(", ")}

${lines.join("\n")}

_Source: knowledge/memories/{feedback,reference,project,user,patterns,mistakes,inbox}/_
_Triggered by a recall keyword (remember/recall/previous/...). To disable: \`PRISM_MEMORY_RAG_DISABLED=1\`._`;
}

async function main() {
  if (process.env.PRISM_MEMORY_RAG_DISABLED === "1") {
    log("disabled via PRISM_MEMORY_RAG_DISABLED=1");
    emitContinue();
    return;
  }

  const raw = await readStdin();
  let payload = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch { /* ignore */ }
  const prompt = extractPrompt(payload);
  if (!prompt || prompt.length < 10) {
    emitContinue();
    return;
  }

  // Gate 1: recall keyword — the defining trigger for this hook.
  if (!hasRecallKeyword(prompt)) {
    emitContinue();
    return;
  }

  // Run the shared pure-core vault search (in-process, no subprocess).
  const { tokens, hits } = runMemoryIndexSearch(prompt, { topK: TOP_K });

  // Gate 2: dedup — defer to the always-on precheck injector when it covers this
  // prompt. Use the SAME token count the precheck injector would compute (the lib
  // returns it), so the deferral is exact.
  if (precheckCoversPrompt(tokens.length)) {
    log(`deferred to memory-index-precheck (tokens=${tokens.length} hits=${hits.length})`);
    emitContinue();
    return;
  }

  if (hits.length === 0) {
    log(`triggered=true hits=0 tokens=${tokens.length}`);
    emitContinue();
    return;
  }

  log(`triggered=true hits=${hits.length} tokens=${tokens.length} fallback-inject`);
  emitContinue(renderRecallBlock(tokens, hits));
}

// Only run the IO/stdin pipeline when invoked as a hook, not when imported by a
// test (which exercises the pure exports above).
const INVOKED_DIRECTLY = (() => {
  try {
    const argv1 = process.argv[1] ? fileURLToPath(new URL(`file://${process.argv[1].replace(/\\/g, "/")}`)) : "";
    return argv1 && argv1.replace(/\\/g, "/").endsWith("memory-rag-inject.mjs");
  } catch { return false; }
})();

if (INVOKED_DIRECTLY) {
  setTimeout(() => { emitContinue(); process.exit(0); }, HOOK_TIMEOUT_MS);
  main()
    .then(() => process.exit(0))
    .catch((e) => { log(`unhandled: ${e?.message ?? e}`); emitContinue(); process.exit(0); });
}
