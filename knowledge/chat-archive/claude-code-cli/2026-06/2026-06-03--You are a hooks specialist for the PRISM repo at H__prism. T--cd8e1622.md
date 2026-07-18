---
type: "chat-session"
source: "claude-code-cli"
session_id: "cd8e1622-d491-4561-9c61-0f3193d0c565"
title: "You are a hooks specialist for the PRISM repo at H:/prism. TASK: map the PreTool"
date: "2026-06-03"
first_ts: "2026-06-03T03:33:16.818Z"
last_ts: "2026-06-03T03:45:58.185Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 13
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/cd8e1622-d491-4561-9c61-0f3193d0c565/subagents/workflows/wf_fe592a15-732/agent-afed8fb3fa9516e8f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# You are a hooks specialist for the PRISM repo at H:/prism. TASK: map the PreTool

> **claude-code-cli** | 2026-06-03 | 32 msgs (13 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/cd8e1622-d491-4561-9c61-0f3193d0c565/subagents/workflows/wf_fe592a15-732/agent-afed8fb3fa9516e8f.jsonl`

## Transcript

### User | 2026-06-03T03:33:16.818Z

You are a hooks specialist for the PRISM repo at H:/prism. TASK: map the PreToolUse graph-context-inject hooks so we know where a compact node->path index would slot in to make them cheaper and add an exact-path line.

Read and report on (open the files in H:/prism/.claude/hooks/):
- pre-bash-graph-inject.mjs
- pre-grep-graph-inject.mjs
- pre-read-graph-inject.mjs
- pre-write-graph-inject.mjs
For EACH: how does it currently resolve graph hits? Does it parse system-graph.json (548MB) per call, read a cache sidecar, or call system-viz-query? What does it inject (the "X node(s) already match" block we see in context)? Where in the code would we add a line like "exact path: <file>" when a single high-confidence node matches? What's the latency/token budget (do they cap output)?

Also check: H:/prism/scripts/lib/system-viz-graph.mjs (the capped graph reader the hooks use) and any find-cache sidecar the hooks read. And check .claude/hooks/HOOK_DIGEST.md for how these hooks are registered/wired in settings.json (the wiring pattern a NEW pre-tool hook must follow).

OUTPUT (raw notes for another agent): per-hook resolution path + cost + the exact insertion point for an injected exact-path line + the settings.json wiring pattern for adding a new PreToolUse hook. Quote real code snippets + line numbers.

### Assistant | 2026-06-03T03:33:39.583Z

I'll map these PreToolUse graph-context-inject hooks. Let me read all the relevant files in parallel.

### Assistant | 2026-06-03T03:33:40.613Z

[tool_use: Read]

### Assistant | 2026-06-03T03:33:41.005Z

[tool_use: Read]

### Assistant | 2026-06-03T03:33:41.459Z

[tool_use: Read]

### Assistant | 2026-06-03T03:33:41.954Z

[tool_use: Read]

### Assistant | 2026-06-03T03:33:42.166Z

[tool_use: Read]

### User | 2026-06-03T03:34:50.554Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-bash-graph-inject.mjs — PreToolUse:Bash graph-context injector.
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A4.
7	 *
8	 * Sibling of pre-read / pre-grep / pre-write graph-inject. Before a Bash
9	 * command runs, surface the master-index nodes the graph already knows —
10	 * but NARROW: bash is mostly `git` / `npm` / `node` / build commands that
11
... [+8206 chars truncated]

### User | 2026-06-03T03:34:50.648Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-grep-graph-inject.mjs — PreToolUse:Grep graph-context injector.
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A2.
7	 *
8	 * Sibling of pre-read-graph-inject.mjs. Before a Grep runs, surface the
9	 * master-index nodes that already match the grep pattern — "the graph
10	 * already knows these N nodes for your pattern" — so Claude can often
11	 * answ
... [+6324 chars truncated]

### User | 2026-06-03T03:34:50.813Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-read-graph-inject.mjs — PreToolUse:Read graph-context injector.
5	 *
6	 * PRISM-SEARCH-MS0 / U-PSM01 (2026-05-18, slot golf).
7	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A5 (2026-05-22, slot echo) — key
8	 *   derivation refactored onto the shared scripts/lib/graph-key-derive.mjs
9	 *   so all four PreToolUse graph hooks (read / grep / write / bash) sh
... [+7411 chars truncated]

### User | 2026-06-03T03:34:50.958Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-write-graph-inject.mjs — PreToolUse:Write graph-context injector.
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A3.
7	 *
8	 * Sibling of pre-read / pre-grep graph-inject. Before a Write creates or
9	 * overwrites a file, surface the master-index nodes whose name overlaps the
10	 * target filename — "the graph has N related/duplicate nodes for this n
... [+6797 chars truncated]

### User | 2026-06-03T03:34:51.169Z

[tool_result] 1	/**
2	 * system-viz-graph — load-once + in-process-cache lib for the system-viz graph.
3	 *
4	 * Extracted from scripts/system-viz-query.mjs so a single process can load
5	 * the ~24 MB graph ONCE and query it many times without re-parsing per call.
6	 *
7	 * P1 / U-CACHE-LIB (SYSTEM-VIZ-UPGRADES-MS0): loadGraph() now keeps a
8	 * module-scope cache keyed on the graph file's mtime + size. A seco
... [+25962 chars truncated]

### Assistant | 2026-06-03T03:34:54.842Z

The four hooks all resolve through the same two-stage path. The critical insight is that **none of them touch `system-viz-graph.mjs` or the 548MB graph at all** — they go through `master-index-search-lib.mjs`. Let me read the actual resolution libs to nail down the cost and the exact insertion point, plus check the wiring docs.

### Assistant | 2026-06-03T03:34:55.786Z

[tool_use: Read]

### Assistant | 2026-06-03T03:34:56.251Z

[tool_use: Read]

### Assistant | 2026-06-03T03:34:56.304Z

[tool_use: Read]

### User | 2026-06-03T03:35:13.474Z

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
... [+28550 chars truncated]

### User | 2026-06-03T03:35:13.513Z

[tool_result] 1	/**
2	 * graph-key-derive.mjs — per-tool key-derivation strategies for the four
3	 * PreToolUse graph-injection hooks (pre-read / pre-write / pre-grep /
4	 * pre-bash).
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A1.
7	 *
8	 * The hooks all share the same shape: derive a small set of "high-ROI" keys
9	 * from the tool's raw input, then call `runMasterIndexSearch` on each. The
10	 * derivation st
... [+5114 chars truncated]

### User | 2026-06-03T03:35:14.176Z

[tool_result] 1	# .claude/hooks/ — HOOK_DIGEST.md
2	
3	_Auto-generated by `scripts/generate-hook-digest.mjs` (U-MWO12, slot:bravo 2026-05-26)._
4	
5	**634 hooks** indexed.  Tier: T0=blocker · T1=soft-gate · T2=injector · T3=observer · T4=async.
6	
7	| Trigger | Hook | Tier | Summary |
8	|---------|------|------|---------|
9	| ? | `_envelope` | T3 | _envelope.mjs |
10	| ? | `_rpc-shim` | T3 | _rpc-shim.mjs |
11	
... [+45531 chars truncated]

### Assistant | 2026-06-03T03:35:17.655Z

I have everything I need to write the report. Let me check the actual settings.json wiring for these four hooks to nail the exact registration pattern a new PreToolUse hook must follow.

### Assistant | 2026-06-03T03:35:20.170Z

[tool_use: Bash]

### User | 2026-06-03T03:36:17.128Z

[tool_result] [
 {
  "matcher": "^(Edit|Write|MultiEdit|NotebookEdit)$",
  "hooks": [
   "pre-write-cross-galaxy-warn.mjs"
  ]
 },
 {
  "matcher": "Grep",
  "hooks": [
   "pre-grep-graph-inject.mjs"
  ]
 },
 {
  "matcher": "Write",
  "hooks": [
   "pre-write-graph-inject.mjs"
  ]
 },
 {
  "matcher": "Bash",
  "hooks": [
   "pre-bash-graph-inject.mjs"
  ]
 }
]

### Assistant | 2026-06-03T03:36:20.606Z

Now let me get the exact JSON shape of one full hook entry (the `command` / `type` / `timeout` fields) plus confirm the pre-read entry exists, since the grep above only showed matchers and stripped the rest.

### Assistant | 2026-06-03T03:36:22.732Z

[tool_use: Bash]

### User | 2026-06-03T03:40:50.658Z

[tool_result] MATCHER: Bash
{
 "type": "command",
 "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/pre-bash-graph-inject.mjs",
 "timeout": 4000
}
---

### Assistant | 2026-06-03T03:40:54.455Z

Note: the pre-read entry did not print — only pre-bash matched. The Read-tool entry uses a different command spelling or matcher. Let me confirm where `pre-read-graph-inject` is wired (it could be in a `Read` matcher group or bundled).

### Assistant | 2026-06-03T03:40:56.798Z

[tool_use: Bash]

### User | 2026-06-03T03:42:53.421Z

[tool_result] pre-read-graph-inject NOT directly in H:/.claude/settings.json PreToolUse

### Assistant | 2026-06-03T03:42:56.021Z

`pre-read-graph-inject` isn't directly in PreToolUse — it's likely inside a Read bundle (read-bundle.mjs). Let me confirm how it's invoked so the report is accurate.

### Assistant | 2026-06-03T03:42:58.699Z

[tool_use: Bash]

### User | 2026-06-03T03:44:56.302Z

[tool_result] pre-read-graph-inject in settings.json string: false
Read-hook: bundles/read-bundle.mjs
Read-hook: wiki-read-offload-advisory.mjs
Read-hook: recall-first-advisory.mjs

### Assistant | 2026-06-03T03:45:58.185Z

Confirmed: `pre-read-graph-inject.mjs` is invoked **inside `bundles/read-bundle.mjs`** (the Read matcher uses a bundle, not individual entries), while pre-grep/pre-write/pre-bash are wired as **standalone PreToolUse entries**. I have everything. Here is the report.

---

# Graph-context-inject PreToolUse hooks — resolution map + insertion points

## TL;DR
**All four hooks resolve via the SAME 2-stage pipeline and NEVER touch the 548MB `system-graph.json` directly, nor `system-viz-graph.mjs`, nor the find-cache sidecar.** They go: `deriveGraphKeys()` (pure, no I/O) → `runMasterIndexSearch()` (reads a pre-built **inverted-index sidecar** `system-graph-index.json`, NOT the 548MB graph). The full-graph parse is a *fallback only*, gated behind a 200MB byte-cap that the live graph exceeds — so in practice these hooks never cold-parse the big graph. A compact node→path index would slot into `searchGraphHits()`'s hit-shape (`master-index-search-lib.mjs:392-411`) and the per-hook `renderInject()`.

---

## Shared resolution pipeline (identical across all 4)

```
stdin JSON → extract (command|pattern|file_path)
  → deriveGraphKeys({input, tool})          [scripts/lib/graph-key-derive.mjs — PURE, no I/O]
  → runMasterIndexSearch(keys.join(" "), {topK})   [scripts/lib/master-index-search-lib.mjs]
       → tokenize()                          [pure]
       → loadGraph()  ← THE COST CENTER
       → searchGraphHits()  → hits[]
  → renderInject(keys, hits) → block (≤1500 bytes)
  → injection-dedup (per session+content/file hash, fail-soft)
  → emit { continue:true, hookSpecificOutput:{ hookEventName:"PreToolUse", additionalContext } }
```

### What `loadGraph()` actually reads (master-index-search-lib.mjs:235-331)
**NOT the 548MB graph in the common path.** Resolution order:
1. **Process-lifetime cache** (`_graphCache`, keyed graphPath+mtime) — useless for hooks (each is a fresh `node` subprocess that calls once and exits). Lines 247-253.
2. **Sidecar fast-path** `tryLoadSidecar()` 
... [+9385 chars truncated]
