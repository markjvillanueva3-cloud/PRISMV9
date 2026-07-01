---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "You are a LOCAL-LLM / BLACKWELL-LEVERAGE discovery agent for PRISM at H:/prism. "
date: "2026-06-09"
first_ts: "2026-06-09T03:52:53.785Z"
last_ts: "2026-06-09T03:55:54.600Z"
cwd: "H:\\prism"
messages: 34
user_msgs: 13
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_95cca8c5-500/agent-a865829bcfe7d3e1d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# You are a LOCAL-LLM / BLACKWELL-LEVERAGE discovery agent for PRISM at H:/prism. 

> **claude-code-cli** | 2026-06-09 | 34 msgs (13 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_95cca8c5-500/agent-a865829bcfe7d3e1d.jsonl`

## Transcript

### User | 2026-06-09T03:52:53.785Z

You are a LOCAL-LLM / BLACKWELL-LEVERAGE discovery agent for PRISM at H:/prism. The new PC has an RTX PRO 6000 Blackwell (96GB VRAM), Ryzen 9 9950X3D2, 127GB RAM, and resident Ollama models (qwen2.5-coder:32b, gpt-oss:120b/20b, qwen3-vl/qwen2.5vl vision, nomic-embed-text). Find HIGH-VALUE PRISM work that SHOULD offload to local LLMs / exploit the GPU but currently does NOT, or under-utilizes it. Look for: (a) Claude-bound tasks that are mechanical (summarize/classify/lint/extract/embed) and could route to Ollama — check H:/prism/.claude/hooks/ + scripts for places still calling Claude for deterministic work; (b) embedding/RAG work that could use the 96GB GPU for bigger batches / more models resident concurrently; (c) the offload ratio (CLAUDE.md says target 30%, current ~13.8%) — what are the biggest un-offloaded categories? Evidence: grep ollama usage, read OllamaHookBridgeEngine refs, H:/prism/scripts/ask-ollama.mjs. For each finding: evidence, est. value (token/$ saved or capability unlocked), effort (S/M/L). Return a prose ranked list (NOT JSON). Top 5.

### Assistant | 2026-06-09T03:52:59.417Z

I'll investigate PRISM's local-LLM offload landscape to find high-value Blackwell/Ollama leverage opportunities. Let me gather evidence systematically.

### Assistant | 2026-06-09T03:53:00.859Z

[tool_use: Bash]

### Assistant | 2026-06-09T03:53:02.459Z

[tool_use: Grep]

### Assistant | 2026-06-09T03:53:02.607Z

[tool_use: Bash]

### User | 2026-06-09T03:53:04.306Z

[tool_result] Found 60 files limit: 60
.claude\hooks\memory-relevance-inject.mjs
.claude\hooks\stop_on_hook_unregistration.mjs
.claude\hooks\__tests__\ollama-cost-router.test.mjs
.claude\hooks\lib\ollama-cost-router.mjs
.claude\hooks\wiki-link-suggest.mjs
.claude\hooks\stop-obsidian-memory-extract.mjs
.claude\hooks\ollama-pipeline-injector.mjs
.claude\hooks\prompt-rewriter-ollama.mjs
.claude\hooks\ollama-engine
... [+2460 chars truncated]

### User | 2026-06-09T03:53:05.868Z

[tool_result] {
  "schemaVersion": "2.0.0",
  "offloaded": 3,
  "keptOnClaude": 24,
  "estimatedTokensSaved": 3727,
  "silentSuggestions": 7,
  "injectedSuggestions": 3,
  "byHook": {
    "ollama-task-offloader": {
      "fired": 33,
      "offloaded": 3,
      "kept": 24,
      "suggested": 6,
      "tokensSaved": 3727
    },
    "grep-index-first": {
      "fired": 270,
      "suggested": 31
    },
    "ollam
... [+2275 chars truncated]

### User | 2026-06-09T03:53:08.022Z

[tool_result] #!/usr/bin/env node
/**
 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
 *
 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
 * Claude context window. Claude invokes this via Bash; only the compact
 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
 * files, build-error dumps — are processed here in the subprocess and
 * di
... [+5279 chars truncated]

### Assistant | 2026-06-09T03:53:11.149Z

The offload stats reveal a lot already. Let me dig deeper into the high-volume categories and the embedding/RAG surfaces.

### Assistant | 2026-06-09T03:53:14.326Z

[tool_use: Bash]

### User | 2026-06-09T03:53:19.767Z

[tool_result] TOTALS:
 offloaded 3 keptOnClaude 24
 ratio 11.1 %

EVENT CATEGORY COUNTS (keep decisions = un-offloaded):
  ('orchestration', 'keep') 14
  ('operator_directive', 'keep') 5
  (None, 'suggest') 4
  ('unknown', 'keep') 3
  ('fleet-reaper-prewarm', 'suggest') 2
  ('fleet-reaper-hint', 'suggest') 2
  ('summary', 'offload') 2
  ('summary', 'suggest') 2
  ('safety_physics', 'keep') 1
  ('d
... [+57 chars truncated]

### Assistant | 2026-06-09T03:53:24.456Z

The event log only has 27 events (it's a recent reset). The real signal is in the `byHook` aggregates: `ollama-route-pretooluse` fired 599 times, offloaded 2, kept 592. That's the smoking gun. Let me examine the biggest un-offloaded surfaces — scrutiny reviewers, OCR/vision, embeddings, and what scripts still call Claude for mechanical work.

### Assistant | 2026-06-09T03:53:27.417Z

[tool_use: Bash]

### Assistant | 2026-06-09T03:53:28.313Z

[tool_use: Bash]

### User | 2026-06-09T03:53:32.429Z

[tool_result] scripts/ask-ollama-fallback.test.mjs
scripts/ask-ollama.mjs
scripts/batch-ollama-vision-extract.mjs
scripts/brain-refresh.mjs
scripts/build-memo-embedding-cache.mjs
scripts/build-memory-embeddings-sidecar.mjs
scripts/build-node-embeddings.mjs
scripts/build-wiki-embeddings.mjs
scripts/build-wiki-leaf-index.mjs
scripts/chunk-claudemd-vault.mjs
scripts/core/semantic_code_index.py
scripts/cron-revwalk
... [+2191 chars truncated]

### User | 2026-06-09T03:53:36.393Z

[tool_result] === scripts/ollama-offload-dashboard.mjs ===
#!/usr/bin/env node
/**
 * ollama-offload-dashboard.mjs — print last-24h Ollama offload stats
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P0-U03.
 *
 * Reads mcp-server/data/state/ollama-offload-stats.json (schemaVersion 2.0.0)
 * and prints:
 *   1. Top-line totals (since last reset)
 *   2. Per-hook fire counts (which hooks are doing the routing)
 *   3. Last 24h
... [+4717 chars truncated]

### Assistant | 2026-06-09T03:53:40.968Z

Good — there's already a Blackwell-aware model resolver. Now let me check the embedding pipeline (is it using GPU/nomic or CPU/ONNX?), the OCR/vision corpus loop, and what the scrutiny reviewers cost since they're the biggest Claude-bound spend.

### Assistant | 2026-06-09T03:53:44.824Z

[tool_use: Bash]

### Assistant | 2026-06-09T03:53:47.305Z

[tool_use: Bash]

### User | 2026-06-09T03:53:49.901Z

[tool_result] === LocalEmbeddingEngine (CPU ONNX or GPU?) ===
4: * Phase external-infra. Runs Xenova's ONNX-backed MiniLM (or any feature-
35:export const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";
36:export const DEFAULT_DIM = 384;

=== OllamaEmbedderEngine ===
7: * Lightweight wrapper around Ollama's `/api/embeddings` endpoint specialized
44:  /** Override the embeddings endpoint. Default http://127.0.0.1:114
... [+703 chars truncated]

### User | 2026-06-09T03:53:52.439Z

[tool_result] === build-node-embeddings backend ===
5: * Computes a 768-d nomic-embed-text semantic vector for every node in
22: *   3. LocalEmbedding fallback — on Ollama failure, zero-pad a 384-d local
23: *      vector to 768 and tag embedding_source:"local" so eval can stratify.
61:const MODEL = "nomic-embed-text";
62:const EMBED_DIM = 768;
66:const OLLAMA_URL = `http://${OLLAMA_HOST.replace(/^https?:\/\//,
... [+2490 chars truncated]

### Assistant | 2026-06-09T03:53:56.000Z

Key finding: embeddings already use Ollama nomic-embed-text, but they call `/api/embeddings` ONE PROMPT AT A TIME (`prompt: text`, sequential `ollamaEmbed` calls). The 96GB GPU could batch these massively. Let me confirm the sequential pattern and check the vision/OCR loop and scrutiny reviewer spend.

### Assistant | 2026-06-09T03:53:59.968Z

[tool_use: Bash]

### User | 2026-06-09T03:54:05.021Z

[tool_result] === build-node-embeddings: sequential or batched? ===
15: *   1. p-limit concurrency (default 4) — the wiki version is serial; 372k
16: *      nodes serial at ~30ms/POST ≈ 3h. Bounded concurrency cuts that ~4x.
171:  for (const e of ents) {
213:  for (const x of vec) norm += x * x;
217:  for (const x of unit) { const a = Math.abs(x); if (a > maxAbs) maxAbs = a; }
256:    for (const line of fs.read
... [+2506 chars truncated]

### Assistant | 2026-06-09T03:54:25.176Z

Now I have a clear picture of two embedding gaps. The key insight: `build-node-embeddings` uses p-limit concurrency of 4 against the per-prompt `/api/embeddings` endpoint, NOT the batch `/api/embed` endpoint. Let me confirm the batch endpoint isn't used anywhere for real embeddings, check the scrutiny reviewer / OCR closed-loop spend, and look at the prompt-rewriter and ollama-route-pretooluse (the 599-fire hook).

### Assistant | 2026-06-09T03:54:27.469Z

[tool_use: Bash]

### User | 2026-06-09T03:54:31.867Z

[tool_result] === ollama-route-pretooluse: what does it route, why 592 keeps? ===
#!/usr/bin/env node
// tier: T1
/**
 * ollama-route-pretooluse.mjs — PreToolUse:Read — route trivial bulk reads at the local LLM.
 *
 * U-HKA04 of HOOKS-AUTOMATION-V2-MS0. Tool-level complement to the prompt-level
 * offloaders (ollama-auto-router.mjs / ollama-task-offloader.mjs) and to
 * mcp-server/src/engines/OllamaHookBridgeEn
... [+4714 chars truncated]

### Assistant | 2026-06-09T03:54:36.427Z

The pretooluse router defaults to SUGGEST mode (`PRISM_OLLAMA_ROUTE_AUTO` not set) — that's why 592/599 are "keeps". It nudges but the model ignores. Now let me check the highest-value Claude-bound spend: the scrutiny 3-of-3 reviewers and OCR closed-loop, plus the prompt-rewriter health.

### Assistant | 2026-06-09T03:54:39.667Z

[tool_use: Bash]

### User | 2026-06-09T03:54:43.036Z

[tool_result] === scrutiny-3way: are reviewer arms Claude agents? (Ollama is advisory-only) ===
9: *   1. Claude reviewer agent A  — holistic strict review (acceptance criteria)
10: *   2. Claude reviewer agent B  — independent second pass, weighted toward
12: *   3. Claude reviewer agent C  — analyst-weighted third pass, focused on hidden
17: * tool. The script emits all three reviewer prompts (`opusReviewerPr
... [+2966 chars truncated]

### Assistant | 2026-06-09T03:54:47.729Z

I have enough evidence. Let me do two final targeted checks — the prompt-rewriter health (is it actually firing or no-op'ing?) and whether the OCR closed-loop / corpus-aggregation uses Claude for dimension extraction vs vision models — then synthesize.

### Assistant | 2026-06-09T03:54:51.499Z

[tool_use: Bash]

### User | 2026-06-09T03:54:55.429Z

[tool_result] === prompt-rewriter health/calibration state ===
=== Does corpus/academy ingest summarize PDFs via Claude or Ollama? ===
scripts/embed-all-skills.mjs
=== weekly-synthesis model ===

### Assistant | 2026-06-09T03:55:54.600Z

I have comprehensive evidence. Let me synthesize the ranked findings.

---

# LOCAL-LLM / BLACKWELL LEVERAGE — Top 5 PRISM Offload Opportunities

The headline number is real: the offload ratio is **11.1%** (offloaded 3, kept 24 in the live event log; CLAUDE.md cites ~13.8% historically), against a 30% target. But the byHook aggregates tell the actual story — the routing infrastructure is *firing heavily and being ignored*: `ollama-route-pretooluse` fired **599 times, kept 592** (2 offloaded); `ollama-task-offloader` fired 33, offloaded 3. The hooks work; the **auto-execute paths are off by default**, so the GPU sits idle while Claude eats the work. Findings ranked by value × tractability:

## 1. Flip `ollama-route-pretooluse` from SUGGEST to AUTO for bulk-data reads — HIGHEST VALUE, LOW EFFORT
**Evidence:** `.claude/hooks/ollama-route-pretooluse.mjs` defaults to suggest-only (`PRISM_OLLAMA_ROUTE_AUTO` unset → nudge, never substitute). It fired **599×, kept 592** (offload-stats.json `byHook.ollama-route-pretooluse`), and the 2 it *did* auto-route already saved 34,500 tokens — i.e. ~17k tokens/offload on bulk logs/jsonl/reports. The hook is fully built: it has a config-file mode (`mcp-server/data/state/ollama-route-config.json {"mode":"auto"}`), a fail-open cascade short-circuit if Ollama/`api/tags` is down, model-allowlist verification, and unified telemetry. It targets ONLY bulk-data files (logs, jsonl/csv dumps, big digests under `state/`/`data/state/`) — source files and edit-targets are left alone.
**Value:** If even 30% of the 592 keeps were auto-routed at ~17k tokens each ≈ **~3M tokens saved** over this window. This single flip likely moves the fleet from 11% → past 30% on its own. The Blackwell makes the substitution near-free (qwen2.5-coder:32b is already the configured model and stays GPU-resident).
**Effort: S** — set `mode:"auto"` in the config file (or `PRISM_OLLAMA_ROUTE_AUTO=1`), validate the fail-open path on a downed Ollama, ship a min-KB floor (24KB
... [+7515 chars truncated]
