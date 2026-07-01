---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Audit Ollama use in the PRISM Obsidian VAULT + MEMORY pipeline. Inspect: scripts"
date: "2026-06-09"
first_ts: "2026-06-09T15:42:37.001Z"
last_ts: "2026-06-09T15:50:57.573Z"
cwd: "H:\\prism"
messages: 48
user_msgs: 18
assistant_msgs: 30
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_7f974777-bf2/agent-a35453cb5da07f624.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Audit Ollama use in the PRISM Obsidian VAULT + MEMORY pipeline. Inspect: scripts

> **claude-code-cli** | 2026-06-09 | 48 msgs (18 user / 30 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_7f974777-bf2/agent-a35453cb5da07f624.jsonl`

## Transcript

### User | 2026-06-09T15:42:37.001Z

Audit Ollama use in the PRISM Obsidian VAULT + MEMORY pipeline. Inspect: scripts/obsidian-memory-sync.mjs, .claude/hooks/stop-obsidian-memory-feed.mjs, memory distillation/dedup/prune scripts (scripts/*memory*.mjs), .claude/hooks/*memory*inject*.mjs (memory-index-precheck-inject, memory-rag-inject), scripts/handoff-memory-seed.mjs, any post-ship distillation. Question: is memory CREATION (distill/summarize/dedup a memo) and INJECTION relevance-gating done by Ollama or Claude/procedural? Where is a local model viable (smaller-model distillation of long memos, dedup-by-embedding via nomic-embed-text, relevance-gate before injecting)? file:line + token evidence. LIVE Ollama models loaded NOW on the 96GB RTX PRO 6000 Blackwell (verified this session): qwen2.5-coder:1.5b, qwen2.5-coder:7b, qwen2.5-coder:32b, gpt-oss:20b, gpt-oss:120b, qwen3-vl:8b(-instruct), qwen2.5vl:7b, moondream:1.8b, llama3.2-vision:11b, nomic-embed-text. So a heavy local tier (32b coder / 120b general / vision / embeddings) is AVAILABLE — recommend the SMALLEST model that does each job well.

ALREADY-VERIFIED-NON-VIABLE (alpha, 2026-06-09, reference_obsidian_tokensavings_premise_falsified):
(a) WIDENING the local-llm-task-router WORK_CLASS_PATTERNS to push offload toward 30% is a FALSE PREMISE — live dashboard: fired=53, offload=3, keep=44, where the 44 keeps are CORRECT (orchestration 34, operator_directive 5, safety 1, deep_reasoning 1 — all judgment tasks that MUST stay on Claude per R5). The low ~5-6% offload rate is an orchestration-heavy SESSION SHAPE, not a misrouting bug. Do NOT propose widening the classifier to offload orchestration/directives/reasoning — that is a REGRESSION.
(b) session-end-goal-synthesis LLM pass is DORMANT (unwired in both settings.json) and reads month-stale data — do NOT propose wiring an LLM pass onto dead data.
The real lever is NOT a classifier code-fix; it is (1) BEHAVIORAL adoption of existing offload suggestions, and (2) routing the HEAVY CREATION/SYNTHESIS wor
... [+814 chars truncated]

### Assistant | 2026-06-09T15:42:45.659Z

I'll audit the Ollama use in the PRISM Obsidian VAULT + MEMORY pipeline. Let me start by locating and reading the actual files.

### Assistant | 2026-06-09T15:42:47.953Z

[tool_use: Bash]

### User | 2026-06-09T15:43:50.367Z

[tool_result] -rwxr-xr-x 1 wompu 197611  6905 Jun  8 22:46 /h/prism/.claude/hooks/stop-obsidian-memory-feed.mjs*
-rwxr-xr-x 1 wompu 197611  7304 Jun  9 04:18 /h/prism/scripts/handoff-memory-seed.mjs*
-rwxr-xr-x 1 wompu 197611 30001 Jun  9 05:14 /h/prism/scripts/obsidian-memory-sync.mjs*
---MEMORY-SCRIPTS---
/h/prism/scripts/audit-memory-dbs.mjs*
/h/prism/scripts/backfill-memory-aliases.mjs*
/h/prism/scripts/bac
... [+3540 chars truncated]

### Assistant | 2026-06-09T15:43:54.217Z

I'll proceed with reading the actual files. Let me read the core pipeline files in parallel.

### Assistant | 2026-06-09T15:43:54.639Z

[tool_use: Read]

### User | 2026-06-09T15:44:30.861Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * obsidian-memory-sync.mjs — Sync PRISM memories to Obsidian vault
4	 *
5	 * Converts PRISM memory system to Obsidian-compatible markdown:
6	 * 1. Reads memory files from ~/.claude/projects/H--prism/memory/
7	 * 2. Converts to Obsidian format with [[wikilinks]]
8	 * 3. Creates relationship links between related memories
9	 * 4. Syncs tribal knowledge tips
10	 *
11	 *
... [+32297 chars truncated]

### Assistant | 2026-06-09T15:44:49.818Z

`obsidian-memory-sync.mjs` is fully procedural — zero Ollama, zero LLM. It's regex frontmatter parse + filesystem copy. Now let me read the Stop feed hook, handoff-memory-seed, and the two injection hooks in parallel.

### Assistant | 2026-06-09T15:44:50.244Z

[tool_use: Read]

### Assistant | 2026-06-09T15:44:50.665Z

[tool_use: Read]

### Assistant | 2026-06-09T15:44:51.148Z

[tool_use: Read]

### Assistant | 2026-06-09T15:44:51.564Z

[tool_use: Read]

### User | 2026-06-09T15:45:21.168Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * stop-obsidian-memory-feed.mjs — Stop Hook
5	 * =========================================
6	 *
7	 * Dedicated, RELIABLE auto-memory -> Obsidian feed.
8	 *
9	 * Spawns `obsidian-memory-sync.mjs --quiet` detached on Stop so every memory
10	 * file written to C:/Users/<u>/.claude/projects/H--prism/memory/*.md gets
11	 * mirrored into the H: Obsidian vault
... [+7033 chars truncated]

### User | 2026-06-09T15:45:22.034Z

[tool_result] 1	#!/usr/bin/env node
2	// handoff-memory-seed.mjs
3	// SYSTEM-VIZ-BRAIN-MS0/U-P1-HANDOFF-MEMORY-SEED
4	//
5	// Append a ## MEMORY_SEED section to a per-agent handoff so the next chat
6	// starts with top-K distilled learnings rather than a blank slate.
7	//
8	// Sources, in order:
9	//   1. mcp-server/data/state/ERROR_LEARN_LEDGER.jsonl — top-3 most-recent
10	//      error-class events with non-e
... [+7558 chars truncated]

### User | 2026-06-09T15:45:22.037Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// memory-index-precheck-inject.mjs — UserPromptSubmit injector (T2, advisory).
4	//
5	// H7 of [[audit-system-synergy-2026-05-09]]: surfaces top-K direct hits over
6	// the Obsidian memory vault (~492 files at audit time) when a user prompt
7	// has 2+ content tokens. Closes the gap left by master-index-precheck-inject
8	// (system-graph node search; only fin
... [+5460 chars truncated]

### User | 2026-06-09T15:45:22.038Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * memory-rag-inject.mjs — UserPromptSubmit hook
5	 *
6	 * When the user prompt contains memory-recall keywords (remember, recall,
7	 * previous, last time, earlier, prior, before, context from), surface the
8	 * most relevant entries from the H-drive vault (knowledge/memories/) and
9	 * inject them as additional context.
10	 *
11	 * INTEL-OLLAMA-OBSIDIA
... [+9321 chars truncated]

### Assistant | 2026-06-09T15:45:31.687Z

Key finding so far: the core sync (`obsidian-memory-sync.mjs`), the Stop feed (`stop-obsidian-memory-feed.mjs`), `handoff-memory-seed.mjs`, and both injectors (`memory-rag-inject.mjs`, `memory-index-precheck-inject.mjs`) are ALL procedural — zero LLM. The injectors gate by token-overlap scoring, not by a model.

The Stop feed spawns `build-memo-embedding-cache.mjs` (line 55) which IS the embedding pipeline. Let me read that, the search lib both injectors share, and the distillation/dedup/prune scripts.

### Assistant | 2026-06-09T15:45:33.220Z

[tool_use: Read]

### Assistant | 2026-06-09T15:45:33.225Z

[tool_use: Read]

### User | 2026-06-09T15:45:39.037Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/build-memo-embedding-cache.mjs
3	// ----------------------------------------
4	// CONTEXT-RETENTION/U-MEMO-SEMANTIC-RECALL (F3a, slot:alpha, 2026-06-08)
5	//
6	// Offline embedding-cache builder for the auto-memory vault. Reads every memo
7	// in the memory dir, embeds the SALIENT slice (frontmatter description + title
8	// + opening paragraph — the same slice th
... [+9657 chars truncated]

### User | 2026-06-09T15:45:39.600Z

[tool_result] 1	#!/usr/bin/env node
2	// Pure-core search over the Obsidian memory vault for free-floating memories
3	// not pre-joined to system-graph.json nodes.
4	//
5	// H7 of [[audit-system-synergy-2026-05-09]]: master-index-search-lib only finds
6	// memories that some system-graph node has linked via knowledge.memoryEntries[].
7	// The ~492 memory .md files in H:/prism/knowledge/memories/{feedback,refere
... [+38766 chars truncated]

### Assistant | 2026-06-09T15:45:55.329Z

Important: the search lib confirms the embeddings sidecar IS Ollama-wired (nomic-embed-text via curl, line 558-581) but there are TWO embedding caches — `build-memo-embedding-cache.mjs` (JSONL, `/api/embed`) and a separate `memory-embeddings-sidecar.json` (int8, packed). Let me check which the hooks actually read, the `memo-embed-lib.mjs`, the distillation scripts, and whether any LLM summarization exists in creation/dedup/prune.

### Assistant | 2026-06-09T15:45:57.378Z

[tool_use: Read]

### Assistant | 2026-06-09T15:45:57.382Z

[tool_use: Read]

### User | 2026-06-09T15:46:07.819Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * memory-relevance-inject.mjs — PreToolUse hook for Edit/Write/MultiEdit.
5	 *
6	 * Before the user edits a file, scan their auto-memory directory for
7	 * any feedback memo that mentions the file path, basename, or symbol
8	 * derived from it. Inject the top-3 matches as PreToolUse context.
9	 *
10	 * Goal: "no repeated mistakes." If past feedback says
... [+20476 chars truncated]

### User | 2026-06-09T15:46:07.822Z

[tool_result] 1	// scripts/lib/memo-embed-lib.mjs
2	// -------------------------------
3	// CONTEXT-RETENTION/U-MEMO-SEMANTIC-RECALL (F3, slot:alpha, 2026-06-08)
4	//
5	// Shared, dependency-free helpers for semantic memory recall: the offline
6	// cache builder (build-memo-embedding-cache.mjs) and the hot-path recall hook
7	// (memory-relevance-inject.mjs) BOTH import from here, so the salient-slice
8	// extra
... [+9059 chars truncated]

### Assistant | 2026-06-09T15:46:22.736Z

Now I have the full INJECTION picture. `memory-relevance-inject.mjs` (PreToolUse, T1) IS Ollama-wired for the semantic-recall stage (line 36, 299: `embedText` via nomic-embed-text). Now let me examine the CREATION side — the distillation/dedup/prune scripts that the question centers on. Let me read those plus check what `distill-session-learnings.mjs` and `post-ship` distillation do.

### Assistant | 2026-06-09T15:46:25.965Z

[tool_use: Bash]

### User | 2026-06-09T15:46:53.700Z

[tool_result] === distill scripts ===
scripts/distill-session-learnings.mjs*
scripts/distill-tribal.mjs*
scripts/run-knowledge-distillation.mjs*
=== post-ship ===
ls: cannot access 'scripts/*post*ship*': No such file or directory
ls: cannot access 'scripts/*postship*': No such file or directory
=== weekly-synthesis grep ollama ===
scripts/weekly-memory-synthesis.mjs
scripts/memory-compress-v2.mjs
=== done ===

### Assistant | 2026-06-09T15:47:14.825Z

Two creation/synthesis scripts reference Ollama: `weekly-memory-synthesis.mjs` and `memory-compress-v2.mjs`. The others (`memory-compact`, `promote-memory-to-wiki`, `distill-session-learnings`, `memory-garden-scan`) do NOT. Let me read the relevant sections of all the creation/dedup/prune scripts to see exactly what's Ollama vs procedural, and which model.

### Assistant | 2026-06-09T15:47:17.761Z

[tool_use: Bash]

### User | 2026-06-09T15:47:33.764Z

[tool_result] ===== scripts/weekly-memory-synthesis.mjs =====
118:    ? ` Per-galaxy themes synthesized by a local LLM (\`PRISM_WEEKLY_LLM_SYNTH\`, $0 Claude tokens).`
144:  // (default-OFF). $0 Claude tokens — synthesis offloaded to the resident
146:  // Fail-open: model down / NONE → empty themes → byte-identical list-only output.
151:    const { callOllama } = await import("./ask-ollama.mjs");
152:    // Cod
... [+6699 chars truncated]

### Assistant | 2026-06-09T15:47:44.569Z

This is the key creation-side picture. Let me read the critical sections: the weekly-synthesis LLM block (line ~140-180), distill-tribal's Q-A note (it explicitly says "no LLM available — re-distill when models loaded"), and the run-knowledge-distillation Ollama wiring + whether it's actually invoked anywhere (cron). Let me also confirm the memory-compress-v2 and memory-compact dedup/prune mechanism (procedural?) and check what's wired in settings.json + cron.

### Assistant | 2026-06-09T15:47:45.672Z

[tool_use: Read]

### User | 2026-06-09T15:47:48.541Z

[tool_result] 100	    lines.push("");
101	    // Optional local-LLM week's-theme (U-OBS-WEEKLY-LLM-SYNTH); present only when
102	    // PRISM_WEEKLY_LLM_SYNTH ran → absent = byte-identical to before. Escape
103	    // interior underscores so a theme can't unbalance the italic blockquote.
104	    const theme = typeof themes.get === "function" ? themes.get(g) : undefined;
105	    if (theme) { lines.push(`> _${Str
... [+3746 chars truncated]

### Assistant | 2026-06-09T15:47:55.786Z

Now let me confirm the procedural-only nature of the dedup/prune scripts (memory-compact, memory-compress-v2) and check what's actually wired/scheduled. Let me grep settings.json and cron for these scripts, and check the run-knowledge-distillation Ollama block plus whether it's invoked.

### Assistant | 2026-06-09T15:48:02.721Z

[tool_use: Bash]

### User | 2026-06-09T15:48:15.624Z

[tool_result] === memory-compact.mjs: dedup/prune mechanism ===
6: * harness silently truncates it past 24576 bytes ("Only part of it was
30: *     the truncation ceiling.
33: * Units: the harness truncates on BYTES (24576). The global memory schema's
53:// The Anthropic harness truncates the auto-loaded MEMORY.md past this many bytes.
66:function makePointerLine() {
80:export function parseMemory(text) {
90:  
... [+5123 chars truncated]

### Assistant | 2026-06-09T15:48:23.579Z

Confirmed: `memory-compact.mjs` and `memory-compress-v2.mjs` are purely byte-truncation (no LLM, no embedding — they enforce the 24576-byte MEMORY.md ceiling). `distill-session-learnings.mjs` is procedural (commit→template). `run-knowledge-distillation.mjs` has full Ollama wiring (`qwen2.5-coder`, `/api/generate`). Let me confirm exactly which settings.json hooks reference these (to distinguish wired-live vs CLI-only) and verify the knowledge-distillation cron is actually scheduled, plus check the embeddings-sidecar builder which the search lib's hybrid arm reads.

### Assistant | 2026-06-09T15:48:33.995Z

[tool_use: Bash]

### User | 2026-06-09T15:48:47.480Z

[tool_result] === which exact hooks/scripts in C: settings.json ===
      1 memory-index-precheck-inject.mjs
      1 memory-index-sidecar-regen.mjs
      1 memory-rag-inject.mjs
      1 stop-obsidian-memory-extract.mjs
      1 stop-obsidian-memory-feed.mjs

=== is knowledge-distillation cron actually a registered scheduled task? ===
scripts/cron/knowledge-distillation-cron.ps1

=== build-memory-embeddings-sidec
... [+3196 chars truncated]

### Assistant | 2026-06-09T15:49:07.273Z

I now have the complete picture. `stop-obsidian-memory-extract.mjs` IS the live Ollama memo-CREATION path (line 121: `qwen2.5-coder:32b`, line 128: `/api/generate` via curl, wired in C: settings.json). Let me verify two final things: the extract hook's actual model/timeout context (line 110-160) to confirm it's the 32b, and whether the knowledge-distillation cron is genuinely registered as a scheduled task vs just a .ps1 on disk.

### Assistant | 2026-06-09T15:49:10.220Z

[tool_use: Bash]

### User | 2026-06-09T15:49:22.133Z

[tool_result] === extract hook: model call + JSON extraction prompt (110-185) ===
        if (text) messages.push(text.slice(0, 500));
      }
      if (entry.type === "human" && entry.message?.content) {
        messages.push(`USER: ${entry.message.content.slice(0, 200)}`);
      }
    } catch {}
  }
  return messages.slice(-20); // Last 20 messages
}

async function queryOllama(prompt) {
  try {
    const bod
... [+2180 chars truncated]

### Assistant | 2026-06-09T15:49:33.283Z

I have everything needed. One critical evidence point on the extract hook: it uses `qwen2.5-coder:32b` with a **15000ms timeout** (line ~129) but the model call passes `num_predict: 300` — and crucially, the hook's `MIN_INTERVAL_MS = 5min` global throttle means with 26 chats it's almost always rate-limited (this is exactly why the doc comment in `stop-obsidian-memory-feed.mjs` says the extract hook is "almost always rate-limited or Ollama-gated"). And there is NO registered scheduled task for `knowledge-distillation` or `weekly-memory-synthesis` — both are CLI/manual-only. Let me do a final token-cost sizing check on the memo corpus to ground the recommendations.

### Assistant | 2026-06-09T15:49:39.034Z

[tool_use: Bash]

### User | 2026-06-09T15:49:46.919Z

[tool_result] === memo corpus size (C: source) ===
3225
=== embeddings sidecar exists + size? (hot-path dense arm) ===
17492720 /h/prism/state/shared/memory-embeddings-sidecar.json
=== memo-embedding-cache.jsonl exists? (relevance-inject dense arm) ===
42220787 /h/prism/state/shared/memo-embedding-cache.jsonl
=== BM25 sidecar (procedural injection backbone) ===
8013273 /h/prism/state/shared/memory-index-sidecar
... [+659 chars truncated]

### Assistant | 2026-06-09T15:50:57.573Z

I have complete evidence. Both dense embedding caches exist and are populated (17.5MB int8 sidecar + 42MB JSONL cache + 8MB BM25 sidecar). The corpus is 3,225 C: memos. Final synthesis follows.

---

# OLLAMA AUDIT — PRISM Obsidian VAULT + MEMORY pipeline

**Verdict up front:** INJECTION's dense arm and memo-CREATION are ALREADY Ollama-wired (nomic-embed-text + qwen2.5-coder:32b). The CREATION path is wired but starved (5-min global throttle × 26 chats → near-zero real fires). The real gaps are (1) the embedding model is over-sized at 768-d when a smaller embed model is available, (2) two LLM SYNTHESIS/distill creators are CLI/cron-only and unscheduled, (3) the heavy local tier (32b/120b) is already correctly chosen where synthesis matters. Everything in the FALSIFIED list is confirmed absent here.

---

## SURFACE 1 — `obsidian-memory-sync.mjs` (C:→H: vault mirror)
**(1) ALREADY Ollama-wired:** NONE.
**(2) GAP:** NONE — and correctly so. Pure regex-frontmatter-parse + filesystem copy (`obsidian-memory-sync.mjs:243-300` parse, `:391-445` copy, `:314-322` `extractWikilinks` is existence-gated string match). This is a deterministic transform → R5 says code, not a model. **No Ollama belongs here.**
**(3) REJECTED:** n/a.

## SURFACE 2 — `stop-obsidian-memory-feed.mjs` (Stop feed orchestrator)
**(1) ALREADY Ollama-wired (indirectly):** spawns `build-memo-embedding-cache.mjs` detached every Stop (`stop-obsidian-memory-feed.mjs:143-154`, default-ON, knob `PRISM_MEMO_EMBED_REFRESH_DISABLE`) → that script embeds via **nomic-embed-text** `/api/embed` batched.
**(2) GAP:** NONE in the hook itself — pure spawn/throttle (`:101-106`). It is the reliable replacement for the starved extract hook.
**(3) REJECTED:** n/a.

## SURFACE 3 — `stop-obsidian-memory-extract.mjs` (LIVE memo CREATION — Ollama)
**(1) ALREADY Ollama-wired:** YES. `queryOllama` uses **`qwen2.5-coder:32b`** via `curl /api/generate` (`stop-obsidian-memory-extract.mjs:121,128`, `num_predict:300, temperature:0.3`, 1
... [+9029 chars truncated]
