---
type: "chat-session"
source: "claude-code-cli"
session_id: "a9284c28-44ab-410b-aa5a-53d41d8084d0"
title: "Synthesize a decision-ready wiring plan for slot:sierra. The operator's directiv"
date: "2026-06-06"
first_ts: "2026-06-06T05:46:39.803Z"
last_ts: "2026-06-06T05:47:46.327Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/a9284c28-44ab-410b-aa5a-53d41d8084d0/subagents/workflows/wf_23b502ce-b7a/agent-ad60ff54a114805c4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Synthesize a decision-ready wiring plan for slot:sierra. The operator's directiv

> **claude-code-cli** | 2026-06-06 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a9284c28-44ab-410b-aa5a-53d41d8084d0/subagents/workflows/wf_23b502ce-b7a/agent-ad60ff54a114805c4.jsonl`

## Transcript

### User | 2026-06-06T05:46:39.803Z

Synthesize a decision-ready wiring plan for slot:sierra. The operator's directive: "wire all nodes, their paths to the obsidian vault, /system-viz, master graph, master index — to skills, scripts and hooks for tool calls that should save on efficiency and token savings."

=== RECON A: CHEAP SURFACES THAT EXIST ===
Perfect! Now I have enough detail. Let me compile the final report based on the data I've gathered:

## FINAL REPORT: CHEAP NODE-ACCESS SURFACES IN H:/PRISM

Based on comprehensive reconnaissance of the PRISM codebase, here is the inventory of token-cheap node-access surfaces that enable node→path lookups without loading the 644MB `system-graph.json`:

| Surface | Invocation | Returns Paths? | Token Cost | Wired/Staged |
|---------|-----------|---|-----------|---------|
| **system-viz-query find** | CLI: `node scripts/system-viz-query.mjs find <query>` | Yes (noteCount, subgroup, layer) | ~20-100 tokens | WIRED |
| **find-cache.json** | Via `loadFindCache()` in node-card-read.mjs | Partial (id/label/layer/subgroup/info; NO wiki/memory docs) | ~55MB sidecar (vs 644MB graph) | WIRED |
| **node-card read-by-id** | CLI: `node scripts/system-viz-query.mjs node-card <id> [<id>...]` | **YES** (id/label/layer/kind/status/info + knowledge:{wikiEntries,memoryEntries}) | ~200 tokens per node | WIRED |
| **readCard(id) / readCards(ids)** | Importable: `scripts/lib/node-card-read.mjs` | YES (compact NodeCard with doc pointers) | ~200 tokens/node | WIRED |
| **node-card-offsets.json + node-cards.jsonl** | Seek index: parse 24MB offsets once, fs.read exact bytes from 159MB jsonl | YES (ProjectedCard shape, never full parse) | ~0.3ms/card warm (~300 tokens total) | WIRED |
| **node-card-prefetch-inject.mjs** | UserPromptSubmit hook (wired after master-index) | YES (injects card + doc pointers via seekCard()) | Zero tool calls; regex ~0ms unless match | WIRED |
| **system-graph-index.json** | Fallback sidecar in readCard (freshness-checked via STAT) | YES (richest: id/labe
... [+34656 chars truncated]

### Assistant | 2026-06-06T05:47:46.327Z

# DECISION-READY WIRING PLAN — slot:sierra

## 1. ONE-PARAGRAPH STATE

The cheap-node-access backbone is **built and live** (CHEAP-NODE-ACCESS-MS0 + CROSS-SUBSTRATE-SYNERGY-MS0): `node_card` reads cost ~200 tokens vs ~186K for a full-graph `Read` (98.7% cut), served by a seekable offset index (`node-cards.jsonl` 159MB + `node-card-offsets.json` 24MB, 301,185 cards) that never touches the 644MB `system-graph.json`; surfaces are wired three ways — CLI (`scripts/system-viz-query.mjs node-card`), importable (`readCard`/`seekCard` in `scripts/lib/node-card-read.mjs`), and a zero-tool-call UserPromptSubmit hook (`node-card-prefetch-inject.mjs`). Each card already carries 4 of 5 node→path edges (`id`, `wikiPath`, `pointerPath`, doc-pointer arrays), and 120 typed cross-substrate edges (82 `owned-by-slot` + 38 `documented-by`) bridge system-viz ↔ Obsidian/Wiki for all 34 galaxies. **The real remaining gap is not the backbone — it is the consumer wiring**: the cheap surfaces exist but the upstream injectors and skills that operators actually hit (`pre-bash-graph-inject`, `pre-grep-graph-inject`, `master_index_query`, `/nav`) still emit bare node names instead of routing through `seekCard()`, so the operator pays a follow-up tool call (or worse, a full-graph `Read`) to get the doc pointers the card already holds. Plus one defensive last-resort full-graph parse still lurks in `generate-executive-briefing.mjs`.

## 2. WIRING PUNCH LIST (dependency-ordered)

| # | File(s) | Change (1-3 lines) | Routes to cheap surface | Tokens saved/fire | Effort | Class |
|---|---------|--------------------|-----------------------|-------------------|--------|-------|
| **1** | `.claude/hooks/pre-bash-graph-inject.mjs` (~L75-79, `renderInject()`) | After exact-match resolve, call `seekCard(h0.label)` and render the card body (wiki/memory doc pointers) in the banner | `seekCard()` (offset index) | ~100 (no follow-up node_card call) | **S** | SAFE-AUTONOMOUS |
| **2** | `scripts/generate-executive
... [+6892 chars truncated]
