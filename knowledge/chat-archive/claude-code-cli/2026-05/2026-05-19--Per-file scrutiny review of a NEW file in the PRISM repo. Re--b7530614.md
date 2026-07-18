---
type: "chat-session"
source: "claude-code-cli"
session_id: "b7530614-3417-4245-bc20-f90161b872c9"
title: "Per-file scrutiny review of a NEW file in the PRISM repo. Read the WHOLE file en"
date: "2026-05-19"
first_ts: "2026-05-19T02:26:25.495Z"
last_ts: "2026-05-19T02:27:06.773Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-a694dbc6d9b616143.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Per-file scrutiny review of a NEW file in the PRISM repo. Read the WHOLE file en

> **claude-code-cli** | 2026-05-19 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-a694dbc6d9b616143.jsonl`

## Transcript

### User | 2026-05-19T02:26:25.495Z

Per-file scrutiny review of a NEW file in the PRISM repo. Read the WHOLE file end-to-end and grade PASS or FAIL.

FILE TO REVIEW: H:/prism/scripts/build-graph-index.mjs

UNIT SPEC (what it must satisfy): H:/prism/state/shared/specs/UNITS/U-MASTER-INDEX-SIDECAR.md — read it. This is File 1 of a 5-file build: the offline inverted-index sidecar generator.

CONTRACT IT MUST MATCH EXACTLY (the load-bearing requirement):
- H:/prism/scripts/lib/master-index-search-lib.mjs contains `loadGraph` (around line 145-223) and `searchGraphHits` (line 237-301). Read both.
- build-graph-index.mjs must build an inverted index whose token→node mapping is IDENTICAL to what `loadGraph` builds today. loadGraph's per-node blob is: `${n.id} ${n.label ?? ""} ${n.info ?? ""} ${wikiNames} ${memNames}` where wikiNames/memNames come from `n.knowledge.wikiEntries`/`memoryEntries` mapped through a module-private `entryName` function (line 109-118 of the lib). It tokenizes with `tokenize(blob, {maxTokens: MAX_SAFE_INTEGER, maxLen: MAX_SAFE_INTEGER})`.
- The sidecar's compact `nodes[]` must carry enough that File 3's loader can rebuild nodes on which `searchGraphHits` works UNCHANGED. searchGraphHits reads from each node: `id`, `label`, `info`, `layer`, `status`, `knowledge.wikiEntries`, `knowledge.memoryEntries`.

VERIFY SPECIFICALLY — flag P0/P1 for any failure:
1. Blob construction parity — does build-graph-index.mjs build the EXACT same blob string as loadGraph (line 207)? Any drift in field order, separators, `?? ""` handling, or entryName logic = hit-scoring drift = P0.
2. The replicated `entryName` — does it match the lib's `entryName` (lib line 109-118) exactly?
3. Posting integrity — postings are integer indices into `nodes[]`. Can a posting ever point at an index that has no node (e.g. if tokenize threw after a node was pushed, or before)? Trace the ordering.
4. Idless/null node handling — loadGraph does `if (!n || typeof n.id !== "string") continue;`. Does the generator mirror this, and a
... [+767 chars truncated]

### Assistant | 2026-05-19T02:26:33.167Z

I'll review this file thoroughly. Let me start by reading the file under review, the spec, and the contract files.

### Assistant | 2026-05-19T02:26:33.543Z

[tool_use: Read]

### Assistant | 2026-05-19T02:26:34.434Z

[tool_use: Read]

### Assistant | 2026-05-19T02:26:34.693Z

[tool_use: Read]

### User | 2026-05-19T02:26:38.440Z

[tool_result] 1	/**
2	 * master-index-search-lib.mjs
3	 *
4	 * Shared keyword search over PRISM's two large knowledge corpora:
5	 *
6	 *   1. system-graph.json   — every engine/dispatcher/skill/hook/wiki node
7	 *      with pre-joined wiki + memory entry names. BM25-lite weighted scoring.
8	 *
9	 *   2. tribal-embed-index.json — every tribal-knowledge tip (title + text +
10	 *      domain). Keyword-only path (s
... [+20746 chars truncated]

### User | 2026-05-19T02:26:38.464Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-graph-index.mjs — offline inverted-index sidecar generator for
4	 * PRISM master-index search.
5	 *
6	 * UNIT: U-MASTER-INDEX-SIDECAR (DEV-TOOL-CONFLICT-AUDIT-2026-05-17)
7	 *
8	 * WHY: `master-index-search-lib.mjs` `loadGraph()` caps graph loads at 200 MB.
9	 * The merged `system-graph.json` is 372 MB / 243,687 nodes, so every
10	 * master-index search silen
... [+9983 chars truncated]

### User | 2026-05-19T02:26:38.469Z

[tool_result] 1	---
2	unit_id: U-MASTER-INDEX-SIDECAR
3	milestone: DEV-TOOL-CONFLICT-AUDIT-2026-05-17
4	owner_slot: alpha
5	wave: DEV-INFRA
6	cost: M
7	status: pending
8	depends_on: []
9	unblocks: [U-ACTIVATE-BEFORE-BUILD-PRECHECK, full-graph-master-index-recall]
10	roi_score: 9.0
11	generated_at: 2026-05-18
12	generator_version: alpha-investigation-b7530614
13	---
14	
15	# U-MASTER-INDEX-SIDECAR — pre-built in
... [+6331 chars truncated]

### Assistant | 2026-05-19T02:27:06.773Z

I have all three files. Let me verify each contract point carefully.

## Verification against the 9 specified points

**1. Blob construction parity** — loadGraph (line 207):
```js
const blob = `${n.id} ${n.label ?? ""} ${n.info ?? ""} ${wikiNames} ${memNames}`;
```
where `wikiNames`/`memNames` are `.join(" ")` results.

build-graph-index.mjs (lines 112-113):
```js
const blob = `${n.id} ${n.label ?? ""} ${n.info ?? ""} `
  + `${wikiNames.join(" ")} ${memNames.join(" ")}`;
```
Here `wikiNames`/`memNames` are arrays, joined inline. Concatenating: `${n.id} ${n.label ?? ""} ${n.info ?? ""} ` + `${A} ${B}` = `${n.id} ${n.label ?? ""} ${n.info ?? ""} ${A} ${B}`. Field order, separators, `?? ""` handling, and the trailing space before wikiNames all match exactly. **PASS** — and since `tokenize` lowercases + splits on whitespace + strips non-`\p{L}\p{N}_`, the only thing that matters is the set of word characters, which is byte-identical.

**2. Replicated `entryName`** — lib lines 109-118 vs build-graph-index lines 67-76: identical character-for-character (string passthrough, then `.name`, then `.path`, try/catch, `return ""`). **PASS.**

**3. Posting integrity** — lines 127-137: `tokenize(blob, ...)` is called *before* `idx = nodes.length` and `nodes.push(compact)`. If tokenize throws, the catch fires and nothing was pushed. `idx` is captured *after* the push would make it stale — wait, `idx = nodes.length` is taken *before* `nodes.push`, so `idx` correctly equals the index the node will occupy. Then `nodes.push(compact)` then postings push `idx`. Order is correct: tokenize → idx capture → push node → push postings. No posting can point at a missing index. **PASS.**

**4. Idless/null node handling** — line 105: `if (!n || typeof n.id !== "string") continue;` mirrors loadGraph line 197 exactly. Skipped nodes never get an `idx`, never get pushed; postings stay dense and valid. **PASS.**

**5. `Object.create(null)` for `inverted`** — line 102. A token named `__proto__` becomes
... [+2994 chars truncated]
