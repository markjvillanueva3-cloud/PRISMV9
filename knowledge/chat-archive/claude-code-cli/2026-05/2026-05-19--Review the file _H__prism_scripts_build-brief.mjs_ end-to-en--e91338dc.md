---
type: "chat-session"
source: "claude-code-cli"
session_id: "e91338dc-6a34-4db2-9d78-8cb86d5548d3"
title: "Review the file `H:/prism/scripts/build-brief.mjs` end-to-end (read the WHOLE fi"
date: "2026-05-19"
first_ts: "2026-05-19T02:57:29.881Z"
last_ts: "2026-05-19T02:59:38.248Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/e91338dc-6a34-4db2-9d78-8cb86d5548d3/subagents/agent-a4e9498e5220ef376.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Review the file `H:/prism/scripts/build-brief.mjs` end-to-end (read the WHOLE fi

> **claude-code-cli** | 2026-05-19 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e91338dc-6a34-4db2-9d78-8cb86d5548d3/subagents/agent-a4e9498e5220ef376.jsonl`

## Transcript

### User | 2026-05-19T02:57:29.881Z

Review the file `H:/prism/scripts/build-brief.mjs` end-to-end (read the WHOLE file). This is a new PRISM utility script — a CLI + library that composes a deep "build brief" of relevant knowledge (wiki bodies, tribal tips, regressions, prior commits, master-index hits) for a unit-id or free-text topic, to be read before a build.

CONTRACT it must satisfy:
- Pure decision functions + injected readers — every external read (fs, spawn, search) is an injectable dependency so the whole thing is testable without a live filesystem/model.
- Fail-soft: every missing input (missing file, parse error, search throw) must degrade gracefully and still emit a brief — never throw out of `composeBrief`/`main`.
- Reuses (does NOT duplicate): `lookupUnit/buildQueryTokens/inferDomain/resolveSlotToUnit/gitCommitsForMilestone` from `./unit-knowledge-pack.mjs`, and `runMasterIndexSearch/runTribalSearch/loadTribalIndex/tokenize` from `./lib/master-index-search-lib.mjs`.
- The genuinely new logic: `loadWikiLeafIndex` (parse `_leaf-index.jsonl`), `searchWikiLeaves` (IDF-weighted keyword search), `excerptBody` (relevance-targeted section excerpt), `collectBodies` (read+excerpt with a path-containment guard), `scanRegressions`.

FOCUS your review on:
1. Logic correctness of the algorithms — especially `excerptBody` (section selection, budget math, truncation), `searchWikiLeaves` (IDF computation, two-pass scoring), `tokenScore`, `collectBodies` (limit/stop, missing-list semantics, containment guard).
2. Edge cases: empty/null inputs, body with no headings, single huge section, query with <2 tokens, malformed leaf-index lines, items as strings vs objects.
3. Fail-soft completeness — any path that could throw out of `composeBrief`.
4. Path safety — `normalizeSlug`, `resolveMemoryFile`, the `collectBodies` containment guard.
5. Inlined constants / magic numbers, dead code, unreachable code.
6. Any duplication of logic that already exists in the two imported modules.

You may run `node --check` and
... [+261 chars truncated]

### Assistant | 2026-05-19T02:57:41.256Z

I'll review the file end-to-end.

### Assistant | 2026-05-19T02:57:41.737Z

[tool_use: Read]

### Assistant | 2026-05-19T02:57:42.508Z

[tool_use: Read]

### Assistant | 2026-05-19T02:57:42.571Z

[tool_use: Read]

### User | 2026-05-19T02:57:45.883Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-brief.mjs — deep pre-build knowledge brief for a unit or topic
4	 *
5	 * HIGH-ROI knowledge-injection skill (slot juliett, 2026-05-19).
6	 *
7	 * The gap this closes: PRISM's existing injection surfaces are all SHALLOW.
8	 * master-index-precheck-inject gives ~5 node *names*; wiki-precheck gives 3
9	 * entry *titles*; unit-knowledge-pack lists *pointers*. Not
... [+33261 chars truncated]

### User | 2026-05-19T02:57:46.049Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * unit-knowledge-pack.mjs — per-unit knowledge surfacing for a chat slot
4	 *
5	 * BACKEND-DEV-LOOP / OLLAMA-EXPAND-MS0 follow-on.
6	 *
7	 * Closes the gap behind the operator directive 2026-05-18 charlie:
8	 *   "expand ollama and obsidian utilization for the purpose of developing
9	 *    with all relevant knowledge dedicated to the specific task and unit
10	 *    t
... [+13112 chars truncated]

### User | 2026-05-19T02:57:47.182Z

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
... [+25342 chars truncated]

### Assistant | 2026-05-19T02:57:50.360Z

Now let me verify the script runs and check the imported contract.

### Assistant | 2026-05-19T02:57:51.252Z

[tool_use: Bash]

### Assistant | 2026-05-19T02:57:51.810Z

[tool_use: Bash]

### User | 2026-05-19T02:58:00.666Z

[tool_result] CHECK_OK

### User | 2026-05-19T02:58:09.370Z

[tool_result] [master-index-search-lib] system-graph 372.0MB > cap 200MB — falling back to architecture-graph (28.0MB)
# Build Brief — fleet reaper

**Mode:** topic
**Generated:** 2026-05-19T02:58:03.359Z
**Query tokens:** fleet · reaper

## 📚 Deep wiki context (5)

### fleet-reaper — Fleet Reaper — slot-aware orphan-process reaper
`H:\prism\knowledge\wiki\architecture\fleet-reaper.md`

# Fleet Reaper — slot-aw
... [+2176 chars truncated]

### Assistant | 2026-05-19T02:58:12.309Z

The script runs and produces a sensible brief. Let me verify a few edge-case behaviors and check the imported contract for `searchImpl`.

### Assistant | 2026-05-19T02:58:13.625Z

[tool_use: Bash]

### Assistant | 2026-05-19T02:58:17.667Z

[tool_use: Bash]

### User | 2026-05-19T02:58:28.985Z

[tool_result] {
  "target": "ab",
  "mode": "topic",
  "slot": null,
  "generatedAt": "2026-05-19T02:58:25.005Z",
  "unit": null,
  "domain": null,
  "query": "ab",
  "queryTokens": [],
  "wikiContext": [],
  "memoryContext": [],
  "tribal": [],
  "regressions": [],
  "commits": [],
  "masterHits": [],
  "missingWiki": [],
  "missingMemory": [],
  "warnings": [
    "Query \"ab\" yielded < 2 search tokens — brie
... [+250 chars truncated]

### User | 2026-05-19T02:58:39.772Z

[tool_result] [master-index-search-lib] system-graph 372.0MB > cap 200MB — falling back to architecture-graph (28.0MB)
shape: [ 'tokens', 'hits' ] hits: true first: {"id":"vault.wiki.architecture.fleet-reaper","score":13,"layer":"L10","label":"fleet-reaper","status":"built","wiki":[],"memory":[]}

### Assistant | 2026-05-19T02:59:38.248Z

Now I have everything needed. Let me deliver the review.

## Code Quality Analysis Report

### Summary
- Files Analyzed: 1 (`H:/prism/scripts/build-brief.mjs`, 783 lines) + 2 imported modules cross-checked
- `node --check`: PASS. Live runs (`"fleet reaper"`, thin query `"ab"`, empty target): all produce a brief, never throw.
- Overall: well-structured, genuinely fail-soft, no logic duplication of the imported modules. Two real correctness defects found.

---

### P1 — should fix (gates the verdict)

**P1-1 — `excerptBody` always emits the lead section even when it alone exceeds `maxChars`, so the budget is silently blown.**
`H:/prism/scripts/build-brief.mjs:188-213`

The greedy selection unconditionally seeds `selected = new Set([0])` and `used = scored[0].text.length`. If the lead section is itself larger than `maxChars`, the emit loop's first iteration enters the truncation branch correctly — *but only if `chosen.length === 1`*. The real bug: `used` starts already over budget, so the `if (used >= maxChars) break;` guard at line 192 fires immediately and **no relevant non-lead section is ever considered**, even when the lead is mostly boilerplate and the query-relevant content lives further down. A body with a huge lead section returns a truncated lead and zero of the sections the builder actually needs. The whole point of the section-scoring pass is defeated for exactly the documents (long, multi-section) it was written for.

The docstring (line 159-162) says "always keeps the lead section, then adds the highest token-scoring sections" — but it never accounts for the lead consuming the entire budget. Recommended fix: cap the lead's budget contribution (e.g. seed `used = Math.min(scored[0].text.length, maxChars * 0.5)`), or always run the scoring pass and let the document-order emit loop do the truncation. As written, the truncation emit loop *can* still emit a later section if `used` were under budget — it just never gets the chance.

**P1-2 — `excerptBody` trunca
... [+7693 chars truncated]
