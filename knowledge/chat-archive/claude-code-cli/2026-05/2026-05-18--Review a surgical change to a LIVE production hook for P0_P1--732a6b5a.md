---
type: "chat-session"
source: "claude-code-cli"
session_id: "732a6b5a-50ee-4199-990c-589ff5ab0df0"
title: "Review a surgical change to a LIVE production hook for P0/P1 defects. Grade PASS"
date: "2026-05-18"
first_ts: "2026-05-18T03:20:25.101Z"
last_ts: "2026-05-18T03:21:13.412Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/732a6b5a-50ee-4199-990c-589ff5ab0df0/subagents/agent-af58c90de8029ac21.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review a surgical change to a LIVE production hook for P0/P1 defects. Grade PASS

> **claude-code-cli** | 2026-05-18 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/732a6b5a-50ee-4199-990c-589ff5ab0df0/subagents/agent-af58c90de8029ac21.jsonl`

## Transcript

### User | 2026-05-18T03:20:25.101Z

Review a surgical change to a LIVE production hook for P0/P1 defects. Grade PASS or FAIL.

FILE: H:/prism/.claude/hooks/wiki-precheck-inject.mjs — read it end-to-end.

CONTEXT: This is a wired UserPromptSubmit hook (project settings.json) that fires on EVERY user prompt fleet-wide. It is `continueOnError`/fail-safe — a crash degrades to no-op. The change is WIKI-INJECT-MS0/U-WIM01: an embeddings-staleness guard.

WHAT CHANGED (verify each is correct + safe):
1. New constant `EMB_STALE_HOURS` = `Math.max(1, Number(process.env.PRISM_WIKI_EMB_STALE_HOURS) || 24)`.
2. New pure fn `embeddingStaleness(embMtimeMs, leafMtimeMs)` → `{staleHours, stale}`. Non-finite inputs → not stale.
3. New `computeEmbStaleness()` — fresh statSync of EMB_INDEX + LEAF_INDEX each call (deliberately NOT cached — explain why in a comment); try/catch → not stale on error.
4. New pure fn `staleFooterNote(staleHours, headerCount, generatedAt)` → warning string.
5. `loadEmbeddings()` now captures `__meta` header `count`→headerCount + `generatedAt`; corpus object gained those 2 fields.
6. `semanticFallback()` now returns `stale`, `headerCount`, `generatedAt` on BOTH return paths.
7. `main()` semantic-fallback branch: computes `embStale`/`staleHours`; appends `staleFooterNote` to footer when stale; adds `emb_stale_h` to telemetry; passes `embStale` to `logMiss`.
8. `logMiss()` gained a 3rd param `embStale=false`, recorded as `embStale: !!embStale` in the JSONL.

CHECK SPECIFICALLY:
- Does the staleness compute correctly? `_embeddings.jsonl` legitimately lags `_leaf-index.jsonl` (embeddings only regen when Ollama is up). Is the lag direction right (leafMtime - embMtime, positive = embeddings behind)?
- Is the corpus mtime-keyed cache (`EMB_CACHE`) a problem? Staleness depends on BOTH files' mtimes but the cache key is only emb mtime. Verify computeEmbStaleness is NOT served from cache.
- An OLD `EMB_CACHE` from before this change lacks `headerCount`/`generatedAt`. Does the code degrade gracefully? (`c
... [+522 chars truncated]

### Assistant | 2026-05-18T03:20:33.309Z

I'll review the file end-to-end.

### Assistant | 2026-05-18T03:20:33.636Z

[tool_use: Read]

### User | 2026-05-18T03:20:34.568Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
5	 *
6	 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
7	 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
8	 * additionalContext so Claude doesn't re-derive what the wiki already knows.
9	 *
10	 * Scoring: BM25-lite over [[Name]] + description toke
... [+26259 chars truncated]

### Assistant | 2026-05-18T03:21:13.412Z

I've read the file end-to-end. Here is my analysis of the WIKI-INJECT-MS0/U-WIM01 change.

## Code Quality Analysis Report

### Verification of each changed item

**1. `EMB_STALE_HOURS` (line 58)** — `Math.max(1, Number(...) || 24)`. Correct. `Number("")`→`NaN`→falsy→24; `Number("0")`→0→falsy→24 (floor 1 still applies); negative or junk → clamped to ≥1. Sound.

**2. `embeddingStaleness(embMtimeMs, leafMtimeMs)` (lines 271-277)** — Lag direction is **correct**: `lagMs = leafMtimeMs - embMtimeMs`, positive = leaf index newer than embeddings = embeddings behind. Matches the docstring premise (`_embeddings.jsonl` lags `_leaf-index.jsonl`). Non-finite guard correct. `lagMs <= 0` short-circuits to not-stale. Good.

**3. `computeEmbStaleness()` (lines 281-285)** — **Verified NOT cache-served.** It does fresh `statSync(EMB_INDEX)` + `statSync(LEAF_INDEX)` directly, never touches `EMB_CACHE`. The `EMB_CACHE` mtime-key concern in the brief does not apply — staleness compute is fully decoupled from `loadEmbeddings()`'s cache. The comment (lines 278-280) correctly explains why it's deliberately uncached. Correct.

**4. `staleFooterNote()` (lines 288-291)** — Pure, handles falsy `headerCount` (`|| "?"`) and falsy `generatedAt` (omits the `, generated` clause). Leads with `\n` so it appends as a separate line. OK.

**5. `loadEmbeddings()` __meta capture (lines 308, 314, 321)** — `headerCount = r.count || headerCount`, `generatedAt = r.generatedAt || generatedAt`. Defaults `0`/`""`. Corpus object gains both fields. Correct.

**6. `semanticFallback()` (lines 367-372)** — Both return paths (`ollama_down` line 370, `ok` line 372) carry `stale`, `headerCount`, `generatedAt`. `headerCount = corpus.headerCount || corpus.entries.length` — **graceful degradation against an old `EMB_CACHE`** lacking `headerCount` is satisfied: a stale cache pre-dating this change has no `headerCount` field → `undefined` → falls back to `corpus.entries.length`. Same for `generatedAt || ""`. Confirmed safe.

... [+4632 chars truncated]
