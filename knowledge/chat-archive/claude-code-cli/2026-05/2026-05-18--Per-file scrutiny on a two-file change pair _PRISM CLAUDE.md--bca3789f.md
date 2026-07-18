---
type: "chat-session"
source: "claude-code-cli"
session_id: "bca3789f-eb42-411b-ab21-ca10664f9aec"
title: "Per-file scrutiny on a two-file change pair (PRISM CLAUDE.md gate — strict). Cod"
date: "2026-05-18"
first_ts: "2026-05-18T15:47:15.880Z"
last_ts: "2026-05-18T15:49:09.966Z"
cwd: "H:\\prism"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/bca3789f-eb42-411b-ab21-ca10664f9aec/subagents/agent-a570f4f75e69f6641.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Per-file scrutiny on a two-file change pair (PRISM CLAUDE.md gate — strict). Cod

> **claude-code-cli** | 2026-05-18 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/bca3789f-eb42-411b-ab21-ca10664f9aec/subagents/agent-a570f4f75e69f6641.jsonl`

## Transcript

### User | 2026-05-18T15:47:15.880Z

Per-file scrutiny on a two-file change pair (PRISM CLAUDE.md gate — strict). Code-correctness arm A.

**Context:** OLLAMA-EXPAND-MS0 / U-OE-BRIDGE-L2B-WIKI-LEAVES. The `ollama-prism-bridge.mjs` script gives a local Ollama model 3 read-only tools (viz_search, wiki_lookup, read_excerpt) so a 3B model can investigate the PRISM codebase autonomously at ~0 Claude tokens/turn. The `wiki_lookup` tool previously read ONLY `knowledge/wiki/index.md` (722 entries) — but the system has 1500+ leaf .md files under `knowledge/wiki/architecture/` containing the actual per-engine/per-dispatcher documentation. This change adds a filename-only leaf-file scan + scoring so wiki_lookup returns BOTH the index hits AND up to 6 leaf paths the model can drill into via read_excerpt.

**Files (read end-to-end):**
1. `H:/prism/scripts/ollama-prism-bridge.mjs` — extended (4 const additions, 2 new exported pure functions `listWikiLeafFiles` + `scoreLeafFilenames`, 1 private TTL cache `_leafCache`/`getCachedLeaves`, `wiki_lookup` executor extended to combine index + leaf bodies, toolSpecs description updated, system prompt updated, export block extended)
2. `H:/prism/scripts/__tests__/ollama-prism-bridge.test.mjs` — extended (96 tests total now, all 95 non-LIVE passing; 9 new tests for the leaf feature + 1 pre-existing test message updated for the new no-match wording)

**Live verification I already ran:** `wiki_lookup({ name: "kienzle force" })` returns 7 index lines AND a "Leaf wiki files" section listing 6 paths including `knowledge/wiki/architecture/actions/calc/kienzle-force.md`, `engines/physics/kienzleforcemodelengine.md`, `formulas/formula-constants-kienzleforce.md`. Total output 3046 chars (under TOOL_RESULT_MAX_CHARS=16384). The feature works.

**Weight your review toward correctness (under 400 words):**

1. **Algorithm correctness** — does `listWikiLeafFiles` correctly:
   - exclude `_*.md` files (e.g., `_stats.md`, `_orphans-rescue.md`)?
   - respect the `maxDepth` cap (defense against
... [+1902 chars truncated]

### Assistant | 2026-05-18T15:47:27.117Z

I'll read both files end-to-end and verify the live system state before issuing a verdict.

### Assistant | 2026-05-18T15:47:27.389Z

[tool_use: Read]

### User | 2026-05-18T15:47:29.404Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ollama-prism-bridge.mjs — Ollama → PRISM agentic harness (OLLAMA-EXPAND-MS0/U-OE-BRIDGE-L2)
4	 *
5	 * Layer 2 of the OLLAMA→PRISM-MCP bridge ladder (Layer 1 = ask-ollama.mjs).
6	 *
7	 * Ollama is a model server, NOT an MCP client — it cannot "connect to MCP".
8	 * This script is the missing harness: it acts as the agent loop. It advertises
9	 * a curated, READ-ONLY
... [+40106 chars truncated]

### Assistant | 2026-05-18T15:47:33.369Z

[tool_use: Read]

### User | 2026-05-18T15:47:35.889Z

[tool_result] 1	/**
2	 * ollama-prism-bridge.test.mjs — tests for the Ollama→PRISM agentic harness
3	 * (OLLAMA-EXPAND-MS0/U-OE-BRIDGE-L2).
4	 *
5	 * Coverage:
6	 *  - pure helpers: parseArgs, pickModel, toolSpecs, buildSystemPrompt,
7	 *    normalizeToolCall, validateToolCall, clampToolArgs, confinePath,
8	 *    capToolResult, toolResultMessage, renderTranscript, bridgeSavingsFooter
9	 *  - runAgentLoop orches
... [+47758 chars truncated]

### Assistant | 2026-05-18T15:47:39.879Z

Now let me verify key live state: the system-prompt's tool count, the per-process cache concern, the leaf scan behavior, and downstream confinePath compatibility on Windows.

### Assistant | 2026-05-18T15:47:41.393Z

[tool_use: Bash]

### Assistant | 2026-05-18T15:47:51.475Z

[tool_use: Bash]

### User | 2026-05-18T15:47:59.771Z

[tool_result] (node:23168) ExperimentalWarning: CommonJS module H:\prism\[eval] is loading ES Module H:\prism\scripts\ollama-prism-bridge.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)

### User | 2026-05-18T15:48:26.204Z

[tool_result] First call (cold cache): 229ms
Second call (warm cache): 14ms
Outputs equal: true
confinePath fwd-slash: OK (wiki\architecture\engines\physics\kienzleforcemodelengine.md)
Leaf count: 22734
Approx memory: 4288 KB
Stable sort same-score: A,B
---
Leaf wiki files (use read_excerpt to read): |   knowledge/wiki/architecture/actions/adaptivecontrol/calibration-kienzle.md |   knowledge/wiki/architecture/a
... [+90 chars truncated]

### Assistant | 2026-05-18T15:48:30.150Z

Now I have load-bearing live signal. Let me check one more concern: the `buildToolImpls({root})` path with a non-default root will hit the cache keyed on a different root, which is correct, but let me verify the cache key is `root` (not always `REPO_ROOT`).

### Assistant | 2026-05-18T15:48:30.902Z

[tool_use: Read]

### User | 2026-05-18T15:48:38.589Z

[tool_result] 561	export function buildToolImpls({ root = REPO_ROOT } = {}) {
562	  let graphCache = null; // { ok, graph, file } once loaded
563	  return {
564	    viz_search(args) {
565	      const { query, maxHits } = clampToolArgs("viz_search", args);
566	      if (!graphCache) graphCache = loadGraph({ root });
567	      if (!graphCache.ok) return `ERROR: ${graphCache.error}`;
568	      const hits = searchG
... [+610 chars truncated]

### Assistant | 2026-05-18T15:49:09.966Z

Good — `buildToolImpls({ root })` closes over `root` and passes it to `getCachedLeaves(root)` at line 604. Cache is keyed correctly per-root.

## Verdict: **PASS**

Algorithm correctness, cache safety, path safety, and test integrity all verified — code is shippable. Two non-blocking advisory notes.

### Item-by-item findings

1. **Algorithm correctness** — PASS.
   - `_*.md` excluded: line 504 `if (name.startsWith("_")) continue;` — verified hermetically by test L946-947.
   - `maxDepth` cap: line 485 `if (depth > maxDepth) return;` — verified by test L949-950.
   - `seen` Set: line 486-487 — guards against symlink loops.
   - Fail-soft: lines 480-483 (missing dir) and 491-493 (unreadable subdir) — both verified.

2. **Cache safety** — PASS. `_leafCache` is a `Map` keyed on `root` (line 544, 547-551). `buildToolImpls({root})` closes over `root` and uses it at line 604 → no cross-contamination between roots. Test contamination not a concern: tests that build leaves via `listWikiLeafFiles` directly (L935, L953, L962, L971, L985) inject their own `readdirImpl`/`statImpl` so they never hit `_leafCache`; only the REAL `buildToolImpls()` E2E populates it, which is the desired behavior. **Verified live**: warm cache 14ms vs cold 229ms — cache works. Memory footprint ~4.3 MB for 22,734 leaves — bounded.

3. **Token-scoring** — PASS. `scoreLeafFilenames` (line 527-539): `.md` stripped via `replace(/\.md$/, "")`, case-folded via `toLowerCase()`, sort is descending by score (line 537 `b.score - a.score`). Stable-sort verified live (`A,B` preserved). Order in output: index hits FIRST then leaves (lines 611-613) — correct, since curated index entries are higher-quality than raw filename matches. Verified live: `out.indexOf('|') < out.indexOf('Leaf wiki files')`.

4. **Path safety** — PASS. `relPath = relAbs.split(/[\\/]+/).join("/")` (line 508) — Windows backslashes normalized. **Verified live**: `confinePath("knowledge/wiki/architecture/engines/physics/kienzleforcemodelengine.
... [+2475 chars truncated]
