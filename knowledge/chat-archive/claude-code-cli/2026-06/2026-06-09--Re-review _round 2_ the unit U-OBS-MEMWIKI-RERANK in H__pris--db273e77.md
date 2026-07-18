---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "Re-review (round 2) the unit U-OBS-MEMWIKI-RERANK in H:/prism, slot:alpha. Two c"
date: "2026-06-09"
first_ts: "2026-06-09T08:00:53.175Z"
last_ts: "2026-06-09T08:02:10.208Z"
cwd: "H:\\prism"
messages: 23
user_msgs: 9
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/agent-ad4c55e81e2b66b00.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# Re-review (round 2) the unit U-OBS-MEMWIKI-RERANK in H:/prism, slot:alpha. Two c

> **claude-code-cli** | 2026-06-09 | 23 msgs (9 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/agent-ad4c55e81e2b66b00.jsonl`

## Transcript

### User | 2026-06-09T08:00:53.175Z

Re-review (round 2) the unit U-OBS-MEMWIKI-RERANK in H:/prism, slot:alpha. Two commits: 60805c36c6 (initial) + b9b223d5e7 (scrutiny fix). View the cumulative diff: `git -C H:/prism diff 60805c36c6^ b9b223d5e7 -- scripts/lib/wiki-promo-rerank.mjs scripts/lib/wiki-promo-rerank.test.mjs .claude/hooks/stop-memory-to-wiki-suggest.mjs` and read the final file states.

This adds a local-LLM (Ollama nomic-embed-text) cosine rerank to the dormant memory→wiki promotion advisor (stop-memory-to-wiki-suggest.mjs). Round-1 fix added: a cumulative BUILD_DEADLINE_MS across the title-embed chunk loop, a model-tag stale-guard (re-embed when cached hash != current model), and a prune-to-live-set cache rewrite (ensureTitleEmbeddings now returns only the live candidate subset).

You are arm A (holistic). Verify the final state is correct end-to-end: the deadline/prune/stale-tag additions don't break the happy path; the rerank still ranks correctly; fail-open to keyword fallback still holds; the return-live-subset contract is consistent with how the hook uses it (the hook always passes the full ~484 candidate title list). Run `cd H:/prism && node --test scripts/lib/wiki-promo-rerank.test.mjs` (expect 14/14). Report P0/P1/P2 with file:line and grade VERDICT: PASS or VERDICT: FAIL.

### Assistant | 2026-06-09T08:00:57.635Z

I'll re-review U-OBS-MEMWIKI-RERANK as arm A (holistic). Let me start by viewing the cumulative diff and reading the final file states.

### Assistant | 2026-06-09T08:00:59.256Z

[tool_use: Bash]

### User | 2026-06-09T08:01:02.928Z

[tool_result] diff --git a/.claude/hooks/stop-memory-to-wiki-suggest.mjs b/.claude/hooks/stop-memory-to-wiki-suggest.mjs
index 35f4e3a4d7..8c810ec996 100644
--- a/.claude/hooks/stop-memory-to-wiki-suggest.mjs
+++ b/.claude/hooks/stop-memory-to-wiki-suggest.mjs
@@ -32,6 +32,11 @@ const WIKI_DIRS = [
 
 const DEFAULT_HORIZON_SEC = 900;
 const DEFAULT_TOP_K = 3;
+// Bound the per-run memo set: a bulk mtime touch (
... [+24898 chars truncated]

### Assistant | 2026-06-09T08:01:06.420Z

Let me read the final file states and run the tests in parallel.

### Assistant | 2026-06-09T08:01:07.367Z

[tool_use: Read]

### Assistant | 2026-06-09T08:01:07.864Z

[tool_use: Read]

### Assistant | 2026-06-09T08:01:08.564Z

[tool_use: Bash]

### User | 2026-06-09T08:01:08.599Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * wiki-promo-rerank.mjs — local-LLM (nomic) cosine rerank for the memory→wiki
4	 * promotion advisor (`.claude/hooks/stop-memory-to-wiki-suggest.mjs`, U-HRP06).
5	 *
6	 * THE GAP IT CLOSES. The advisor suggests which existing wiki entry a freshly
7	 * written memo should be promoted into / merged with. Its built-in fallback
8	 * scores the memo summary against wiki e
... [+10458 chars truncated]

### User | 2026-06-09T08:01:08.599Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\stop-memory-to-wiki-suggest.mjs' was already read 8m ago in this session and is unchanged (mtime 1780991382113). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### User | 2026-06-09T08:01:11.987Z

[tool_result]   ...
# Subtest: prepareNomicRerank: ranks candidates by cosine to the query, applies floor
ok 11 - prepareNomicRerank: ranks candidates by cosine to the query, applies floor
  ---
  duration_ms: 0.3579
  ...
# Subtest: prepareNomicRerank: topK truncates after the floor
ok 12 - prepareNomicRerank: topK truncates after the floor
  ---
  duration_ms: 0.1318
  ...
# Subtest: prepareNomicRerank: unkno
... [+451 chars truncated]

### Assistant | 2026-06-09T08:01:17.320Z

Tests pass 14/14. The hook file is already in my context from the diff. Let me read the supporting library (`memo-embed-lib.mjs`) to verify the contracts the rerank depends on — `embedTextBatch`, `cosine`, `loadEmbedCache` — and confirm `loadEmbedCache` surfaces the model tag as `hash`. I also need to verify how the hook consumes the rerank (the `suggestWikiPromotions` signature and `ragMode` claim).

### Assistant | 2026-06-09T08:01:18.278Z

[tool_use: Read]

### User | 2026-06-09T08:01:18.928Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\memo-embed-lib.mjs' was already read 8m ago in this session and is unchanged (mtime 1780980316054). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-09T08:01:19.349Z

[tool_use: Grep]

### User | 2026-06-09T08:01:21.131Z

[tool_result] 11:// rerank-call failure is logged in the advisory output so the operator knows
72:export function extractMemorySummary(filePath) {
109:// Compute top-K nearest wiki entries for each new memory using injected rerank.
110:// `rerank(query, candidates[], topK)` returns [{candidate, score}].
111:// If rerank absent → fallback: simple keyword-overlap on title.
112:export function suggestWikiPromotion
... [+1344 chars truncated]

### Assistant | 2026-06-09T08:01:24.596Z

Both supporting files are already in my context. Let me read the full `suggestWikiPromotions` function body and the surrounding consumer logic in the hook to verify the integration end-to-end, plus confirm `loadEmbedCache`'s `hash` contract from memo-embed-lib.

### Assistant | 2026-06-09T08:01:25.137Z

[tool_use: Read]

### User | 2026-06-09T08:01:26.432Z

[tool_result] 105	  }
106	  return out;
107	}
108	
109	// Compute top-K nearest wiki entries for each new memory using injected rerank.
110	// `rerank(query, candidates[], topK)` returns [{candidate, score}].
111	// If rerank absent → fallback: simple keyword-overlap on title.
112	export function suggestWikiPromotions({
113	  newMemories,
114	  wikiCandidates,
115	  rerank = null,
116	  topK = DEFAULT_TOP_K,
11
... [+3562 chars truncated]

### Assistant | 2026-06-09T08:01:31.501Z

I have the full picture. Let me verify two contract claims I need to confirm before grading: (1) `loadEmbedCache` surfaces the model tag as `hash` (the stale-guard depends on it), and (2) `embedTextBatch` returns the shape the code expects (array of vectors or null). Both files are in my context already from earlier reads. Let me grep them to confirm the exact contract.

### Assistant | 2026-06-09T08:01:33.060Z

[tool_use: Grep]

### User | 2026-06-09T08:01:34.461Z

[tool_result] 12:// loadEmbedCache (read). Both fail-soft (return null) so the hot-path caller
74:  if (typeof text !== "string" || !text.trim()) return null;
84:    if (!r.ok) return null;
88:    return null;
103:export async function embedTextBatch(texts, opts = {}) {
125:    if (!r.ok) return null;
128:    if (!Array.isArray(embs) || embs.length !== input.length) return null; // count mismatch → caller falls
... [+586 chars truncated]

### Assistant | 2026-06-09T08:02:10.208Z

All contracts confirmed. I now have complete end-to-end verification. Let me record my findings.

## Contract verification summary

**`loadEmbedCache` (memo-embed-lib.mjs:147-157)** — returns `Map<name, {vec:number[], hash:string}>`, where `hash` is `typeof o.hash === "string" ? o.hash : ""`. The stale-guard in `ensureTitleEmbeddings:114` (`e.hash !== CACHE_MODEL_TAG`) correctly distinguishes a fresh tag from a stale/missing one. Confirmed.

**`embedTextBatch` (memo-embed-lib.mjs:103-136)** — returns `null` on count-mismatch (line 128), non-ok HTTP (125), or throw (136); otherwise an array. The rerank's `if (!Array.isArray(vecs)) continue;` (line 125) and `if (!Array.isArray(qvecs))` (line 170) match this contract exactly. Confirmed.

**`cosine` (memo-embed-lib.mjs:168)** — used at rerank.mjs:183. Confirmed exported.

## End-to-end trace of the three round-1 fixes

**1. Cumulative `BUILD_DEADLINE_MS` (rerank.mjs:104, 118, 122)** — `start = clock()` taken once before the loop; each iteration checks `clock() - start > deadlineMs` BEFORE issuing the chunk. The deadline test (test:line ~clock advances 6ms/call, deadline 10ms) proves: iter0 check=6 (≤10 → 1 chunk issued), iter1 check=12 (>10 → break). Correct — 1 chunk for 3 titles. The injectable `now` clock makes this deterministically testable (R9-clean). No off-by-one: the check is at loop top, so a chunk is never issued after the deadline passes. Healthy path (≤484 titles, ~2-3s) never trips the 6000ms default.

**2. Model-tag stale-guard (rerank.mjs:114, 128)** — `missing` filter re-embeds when `!e || e.hash !== CACHE_MODEL_TAG`. On re-embed, `map.set(slice[i], {vec, hash: CACHE_MODEL_TAG})` overwrites the stale vector. The stale-tag test confirms `[9,9,9]@old-model` → `[1,0,0]@nomic-embed-text`. Cross-embedding-space cosine is correctly prevented. Correct.

**3. Prune-to-live-set + return-live-subset (rerank.mjs:135-143)** — `hasStale` detects any cached key not in `liveSet`; rewrite persists only `uniq.filter(map
... [+3933 chars truncated]
