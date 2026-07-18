#!/usr/bin/env node
// tier: T2
/**
 * ollama-pipeline-injector.mjs — UserPromptSubmit hook
 *
 * Fires when the user invokes /forge, /forge-audit, /rgs, /scrutinize, /dedup,
 * /precompact, /handoff or any pipeline that historically did NOT route work
 * to Ollama even though the local models were loaded and idle.
 *
 * Injects an additionalContext block listing CONCRETE Ollama+Docker routes
 * the pipeline should use for this turn — model selection, expected token
 * saving, and the exact dispatcher action / CLI call to fire.
 *
 * Advisory only — never blocks. Auto-skips when:
 *   - PRISM_OLLAMA_PIPELINE_INJECT=0
 *   - Ollama daemon is not reachable
 *   - The prompt does not match any pipeline trigger
 *
 * Why a UserPromptSubmit hook (not a skill update):
 *   - Many chats invoke /forge-audit + /rgs without reading the skill body
 *     end-to-end (long docs, post-/compact context loss).
 *   - The skill body lives in markdown — easy to drift from real wiring.
 *   - A hook injects the SAME concrete routes every time, so /forge-audit
 *     run-3 fires the same Ollama calls as run-1.
 *
 * FIRES ON: UserPromptSubmit
 * BLOCKING: never — advisory only
 * KILL SWITCH: PRISM_OLLAMA_PIPELINE_INJECT=0
 */

import { readFileSync } from "node:fs";
import { isOllamaUpSync, readWarmModelsSync } from "../../scripts/lib/ollama-ps-probe.mjs";

const KILL_SWITCH = "PRISM_OLLAMA_PIPELINE_INJECT";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const PROBE_TIMEOUT_SEC = 2;

// TOKEN-SAVINGS-PIVOT/U-PSN-OLLAMA-VERB-TRIGGER (iter4, 2026-05-23, slot:alpha):
// Pre-iter4, this hook ONLY matched slash-command pipelines. Bare-prose prompts
// like "summarize this file" or "explain how this works" got no Ollama nudge
// even though CLAUDE.md §AI SYSTEM ROUTING explicitly names those verbs as
// offload-eligible (code explain/summarize/docstring/classify/lint/diff-
// summary/error-triage → qwen2.5-coder:32b via OllamaHookBridgeEngine).
// Verb-trigger fallback fires ONLY when no slash command matched, so existing
// pipelines never get a duplicate nudge. Disable: PRISM_OLLAMA_VERB_INJECT=0.
const VERB_TRIGGERS = [
  // Order matters — diff-summary before generic summarize so the right route
  // surfaces. error-triage before bare "failing" too.
  { key: "verb-diff-summary",  re: /\bsummari[sz]e\s+(the\s+)?(diff|changes?|commit|pr|pull[\s-]?request)\b/i },
  { key: "verb-error-triage",  re: /\b(triage|why\s+(is|are)\s+(this|these|it|they)\s+(failing|broken)|what(?:'s|\s+is)\s+wrong\s+with)\b/i },
  { key: "verb-docstring",     re: /\b(write|add|generate)\s+(a\s+)?(docstring|jsdoc|tsdoc|doc[\s-]?comment)\b/i },
  { key: "verb-lint",          re: /\b(lint|style[\s-]?check|format[\s-]?check)\b[^?]{0,30}?\b(this|that|the|it|code|file)\b/i },
  { key: "verb-classify",      re: /\b(classif(y|ication)|categori[sz]e|label|tag)\b[^?]{0,30}?\b(this|that|these|those|the|all|items?|of\s+(these|those|the))\b/i },
  { key: "verb-explain",       re: /\b(explain|walk\s+me\s+through|how\s+does|what\s+does)\b[^?]{0,80}?\b(this|that|the\s+(code|function|file|module|class))\b/i },
  { key: "verb-summarize",     re: /\b(summari[sz]e|tl;?dr)\b[^?]{0,80}?\b(this|that|the|file|file)\b/i },
];

// U-PSN-OLLAMA-VERB-TRIGGER-R12-FIX (iter5, 2026-05-23, slot:alpha):
// Verified surface (confirmed via grep against mcp-server/src/tools/dispatchers/
// devDispatcher.ts:8107-8131): `prism_dev:ollama_hook_query` is the ONLY
// MCP action that routes to OllamaHookBridgeEngine. Its `hookType` param
// accepts: grep_index | mcp_route | ai_feature | code_explain | pattern_match
// | validation | general. Iter4 surfaced fake `prism_intelligence:ollama_*`
// actions (none exist) — R12 lie that this iter corrects.
//
// Every route below is one of:
//   1. `prism_dev:ollama_hook_query` with a valid hookType,
//   2. the engine class directly (`OllamaHookBridgeEngine.getInstance().query()`),
//   3. an existing /skill (`/ollama-bridge`, `/ask-ollama`, `/ollama-route-check`).
//
// Build-time regression: see test file
// `__tests__/ollama-pipeline-verb-routes-r12.test.mjs` — asserts no route
// string references the fake `prism_intelligence:ollama_*` namespace and
// that every `prism_*:*` token is in the known-real surface set.
const VERB_ROUTES = {
  "verb-summarize": [
    "Local-LLM offload candidate — per CLAUDE.md §AI SYSTEM ROUTING, *summarize* is qwen2.5-coder:32b territory (zero Claude tokens). Route: `prism_dev:ollama_hook_query` with `hookType:\"general\"` and `prompt:\"summarize <text>\"` OR the `/ollama-bridge` skill.",
    "For large input chunk via the engine directly: `OllamaHookBridgeEngine.getInstance().query(text, {hookType:'general'})`.",
  ],
  "verb-explain": [
    "Local-LLM offload candidate — *explain* is qwen2.5-coder:32b territory per CLAUDE.md §AI SYSTEM ROUTING. Route: `prism_dev:ollama_hook_query` with `hookType:\"code_explain\"` OR the `/ollama-bridge` skill.",
    "Claude only enters when the explanation needs cross-domain synthesis or safety-relevant reasoning — escalate then.",
  ],
  "verb-classify": [
    "Local-LLM offload candidate — *classify* is local-LLM work. Route: `prism_dev:ollama_hook_query` with `hookType:\"general\"` OR the `/ollama-bridge` skill.",
    "For semantic classification across many items, prefer `nomic-embed-text` + Qdrant cosine via the embed pipeline (faster batch).",
  ],
  "verb-docstring": [
    "Local-LLM offload candidate — *docstring/jsdoc* generation is qwen2.5-coder:32b territory. Route: `prism_dev:ollama_hook_query` with `hookType:\"code_explain\"` and `prompt:\"docstring for <code>\"` OR the `/ollama-bridge` skill.",
  ],
  "verb-lint": [
    "Local-LLM offload candidate — *lint/style* review fits qwen2.5-coder:32b. Route: `prism_dev:ollama_hook_query` with `hookType:\"code_explain\"` OR the `/ollama-bridge` skill.",
    "Hard-rule linting (eslint/biome) should still run via `rtk lint` — Ollama supplements style commentary, not the deterministic gate.",
  ],
  "verb-diff-summary": [
    "Local-LLM offload candidate — *diff-summary* is qwen2.5-coder:32b territory. Route: `prism_dev:ollama_hook_query` with `hookType:\"general\"` and the diff as `prompt` OR the `/ollama-bridge` skill.",
    "For commit-message drafting from a diff, the same call returns a 1-line summary cheaply.",
  ],
  "verb-error-triage": [
    "Local-LLM offload candidate — *error triage* per CLAUDE.md §AI SYSTEM ROUTING. Route: `prism_dev:ollama_hook_query` with `hookType:\"validation\"` OR the `/ollama-bridge` skill.",
    "Claude takes over IFF the triage names a safety-critical surface (physics/safety/dispatcher contracts) — escalate then.",
  ],
};

// U-PSN-OLLAMA-VERB-TRIGGER-R12-FIX (iter5): export VERB_ROUTES for build-time
// regression test that asserts every route string references only real MCP
// surfaces. Pure data; exported as a frozen const so tests can inspect.
export const _VERB_ROUTES_FOR_TESTS = Object.freeze(VERB_ROUTES);

// Pure: match a verb-trigger against the prompt. Exported for tests.
// Returns the matched key or null. First match wins (order in VERB_TRIGGERS
// matters — diff-summary precedes generic summarize, etc.).
export function matchVerbTrigger(prompt) {
  if (typeof prompt !== "string" || prompt.length === 0) return null;
  for (const t of VERB_TRIGGERS) {
    if (t.re.test(prompt)) return t.key;
  }
  return null;
}

// Pure: match a slash-command pipeline trigger. Exported for tests.
export function matchPipelineTrigger(prompt) {
  if (typeof prompt !== "string" || prompt.length === 0) return null;
  for (const t of PIPELINE_TRIGGERS) {
    if (t.re.test(prompt)) return t.key;
  }
  return null;
}

// Pipeline trigger detection. First match wins; the routes table below uses
// the matched key to surface the right model + service recommendations.
const PIPELINE_TRIGGERS = [
  { key: "forge-audit", re: /\/(forge-audit|forge2|forge3)\b/i },
  { key: "rgs", re: /\/(rgs2?|rgs-sync|rgs3)\b/i },
  { key: "forge-triple", re: /\/forge-triple\b/i },
  { key: "forge7", re: /\/(forge[4-7]|forge-hooks)\b/i },
  { key: "forge-build", re: /\/forge-(engines|tests|schema|skills|wiring)\b/i },
  { key: "scrutinize", re: /\/(scrutinize|scrutiny-3way|scrutiny-batch)\b/i },
  { key: "dedup", re: /\/dedup\b/i },
  { key: "precompact", re: /\/precompact\b/i },
  { key: "deep-search", re: /\/deep-search\b/i },
  { key: "pdf-learn", re: /\/(pdf-learn|video-learn|doc-learn)\b/i },
  { key: "close-out", re: /\/close-out-audit\b/i },
];

// Concrete Ollama+Docker routes per pipeline. Phrased so a chat can copy-paste
// the right command — never abstract "consider using Ollama".
const PIPELINE_ROUTES = {
  "forge-build": [
    "**Mechanical generation phases** -- forge-engines/tests/schema/skills/wiring are boilerplate-heavy. Route scaffold/docstring/test-stub/schema-draft to `qwen2.5-coder:32b` (Blackwell 96GB, local, free); Claude only validates physics/safety/real-value bounds. Per-phase lane: scripts/lib/forge-route.mjs routeForgePhase.",
    "**Reserve Opus/Fable** for the design + wiring-correctness decision; everything mechanical is offloadable -> >=30% offload. Actualize via `node scripts/ask-ollama.mjs <mode>`.",
  ],
  "forge-audit": [
    "**Phase 0** (awareness summarize) — call `qwen2.5-coder:32b` to compress the 4 awareness layers into <500 tokens before Phase 1 fans out. Saves ~5K tokens/run.",
    "**Phase 1** (parallel domain audit) — add `gpt-oss:120b` as a 4th reviewer role for cross-domain reasoning. Local, free, parallel to Claude agents A/B/C.",
    "**Phase 4** (synthesize) — use `nomic-embed-text` + Qdrant (if up) to detect finding-dedup against the wiki BEFORE writing AUDIT-LATEST.md. Saves manual review.",
    "**Phase 5** (wiki write) — call `qwen2.5-coder:32b` to draft the wiki entry stub; Claude only edits, doesn't write from scratch.",
  ],
  "rgs": [
    "**Brainstorm** — first-pass milestone proposals via `gpt-oss:120b` (offloaded from Claude). Claude synthesizes the final list.",
    "**Utilize** — semantic search across 7,244+ MCP actions via `nomic-embed-text` + Qdrant. Better recall than substring grep.",
    "**Generate** stage 4 (test plan) — `qwen2.5-coder:32b` writes a draft test suite; Claude validates safety-critical assertions.",
  ],
  "forge-triple": [
    "**Engine generation** — `qwen2.5-coder:32b` for boilerplate; Claude for physics + safety logic.",
    "**Test writing** — `qwen2.5-coder:32b` writes assertion stubs; Claude validates real-value bounds.",
  ],
  "forge7": [
    "**Phase routing (NEW, U-FORGE-ROUTE)** -- run planForgeRouting from scripts/lib/forge-route.mjs for the per-phase lane plan. MECHANICAL phases (scout/enumerate/dedup_check/docstring/summarize/test_scaffold/lint/html_emit/audit_scan) route to Ollama (qwen2.5-coder:32b / ask-ollama) or Sonnet/Haiku on a miss -- NEVER this Opus session.",
    "**Reserve Opus/Fable** for design / plan_review / the verify_gate decision / refactor / safety only (the CLAUDE_LANE phases). Everything else is offloadable.",
    "**Fan-out cap** -- forgeConcurrencyCap({cores, budgetTotal}) = min(16, cores-2, budget/100k). Never burst-spawn the whole candidate set at once (the 362-bash fork-storm class).",
  ],
  "scrutinize": [
    "**Reviewer D** (4th opinion, free) — invoke `qwen2.5-coder:32b` in parallel with A/B/C. Cross-checks for inlined constants, stub assertions, integration coupling.",
    "**Embed-based regression check** — `nomic-embed-text` cosine against prior approved scrutiny findings (Qdrant if up, else local jsonl).",
  ],
  "dedup": [
    "**Embedding cosine pass** — `nomic-embed-text` for semantic dedup; current `duplicationGuardEngine` uses substring only.",
  ],
  "precompact": [
    "**Conversation summarize** — `qwen2.5-coder:32b` drafts the per-chat handoff RESUME; Claude polishes. Saves token-budget for the post-compact chat.",
  ],
  "deep-search": [
    "**Reasoning pass** — `gpt-oss:120b` for the deep-search 'reason' stage after master-index hits return < 0.5 confidence.",
  ],
  "pdf-learn": [
    "**Vision OCR** — `llama3.2-vision:11b` for blueprint/PDF page-1 classification before vendor-API call (saves quota).",
    "**Knowledge extraction** — `qwen2.5-coder:32b` extracts structured facts; nomic-embed for vector ingest into Qdrant.",
  ],
  "close-out": [
    "**Envelope-vs-git diff summarize** — `qwen2.5-coder:32b` compresses the diff to a 1-line per drift; Claude decides flip-or-skip.",
  ],
};

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function main() {
  if (process.env[KILL_SWITCH] === "0") {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  const raw = readStdin();
  let input;
  try { input = JSON.parse(raw); } catch { input = {}; }
  const prompt = String(input.prompt || input.user_prompt || "");

  // Match pipeline trigger first (slash commands)
  let matched = matchPipelineTrigger(prompt);
  let kind = matched ? "pipeline" : null;

  // U-PSN-OLLAMA-VERB-TRIGGER fallback: only when no slash matched.
  // Verb-trigger detection catches bare-prose offload-eligible prompts.
  if (!matched && process.env.PRISM_OLLAMA_VERB_INJECT !== "0") {
    matched = matchVerbTrigger(prompt);
    if (matched) kind = "verb";
  }

  if (!matched) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  // Probe Ollama — if down, advise auto-start instead of routes
  const ollamaUp = isOllamaUpSync({ ollamaUrl: OLLAMA_URL, timeoutSec: PROBE_TIMEOUT_SEC });
  const warm = ollamaUp ? readWarmModelsSync({ ollamaUrl: OLLAMA_URL, timeoutSec: PROBE_TIMEOUT_SEC }) : [];

  const header = kind === "verb"
    ? `## 🧠 Ollama offload candidate (verb-trigger: ${matched})\n\n`
    : `## 🧠 Ollama pipeline routes for /${matched}\n\n`;
  let block = header;
  if (!ollamaUp) {
    block += "_Ollama is **down**. Auto-start: `node H:/prism/mcp-server/scripts/ollama-docker-launcher.mjs --services=ollama --skip-pull`._\n\n";
    block += "_When up, the following routes apply:_\n";
  } else {
    block += `_Ollama is **up** · ${warm.length} model(s) warm in VRAM (${warm.slice(0, 3).join(", ") || "none — first call cold-starts"})_.\n\n`;
  }

  const routes = kind === "verb"
    ? (VERB_ROUTES[matched] || [])
    : (PIPELINE_ROUTES[matched] || []);
  for (const r of routes) block += `- ${r}\n`;

  block += `\n_Probe all local services: \`node H:/prism/scripts/ollama-docker-health.mjs\`_\n`;
  block += `_Disable this hook: \`${KILL_SWITCH}=0\`_\n`;

  process.stdout.write(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: block,
      },
    })
  );
}

// U-PSN-OLLAMA-VERB-TRIGGER (iter4): guard main() so the module is safely
// importable for tests without firing stdin-read + stdout-write side-effects.
if (process.argv[1] && process.argv[1].endsWith("ollama-pipeline-injector.mjs")) {
  try { main(); }
  catch { process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true })); }
}
