---
type: "chat-session"
source: "claude-code-cli"
session_id: "4b1bbdf2-c878-441d-93bc-88ca59603734"
title: "Review a PRISM hook consumer rewire (HMEMV09). Read both files END TO END. FILES"
date: "2026-06-11"
first_ts: "2026-06-11T03:04:05.622Z"
last_ts: "2026-06-11T03:05:21.662Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/4b1bbdf2-c878-441d-93bc-88ca59603734/subagents/agent-ada2fdc436fe482a7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Review a PRISM hook consumer rewire (HMEMV09). Read both files END TO END. FILES

> **claude-code-cli** | 2026-06-11 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4b1bbdf2-c878-441d-93bc-88ca59603734/subagents/agent-ada2fdc436fe482a7.jsonl`

## Transcript

### User | 2026-06-11T03:04:05.622Z

Review a PRISM hook consumer rewire (HMEMV09). Read both files END TO END.

FILES:
1. H:/prism/.claude/hooks/wiki-precheck-inject.mjs -- a UserPromptSubmit hook that fires on EVERY prompt across 26 concurrent chat slots (HIGH BLAST RADIUS, must be fail-safe / never throw / never block). I rewired its SEMANTIC FALLBACK (the path that runs only when BM25 over the wiki index finds nothing). Changed regions:
   - Added imports openSync/readSync/closeSync (line ~32) + 4 WIKI_QDRANT_* consts (lines ~92-103).
   - Added `readEmbMeta()` (reads ONLY the __meta first line, ~1KB, to avoid the 137MB full-file load).
   - Added `qdrantRankWiki(qvec, topK, opts)` (ANN POST to prism_wiki/points/search; returns {hits:[{n,t,cos}]} on a Qdrant answer, null on down/error).
   - REFACTORED `semanticFallback(prompt)`: Qdrant ANN primary (when WIKI_QDRANT_ENABLED) -> on Qdrant-down, falls through to the NEW `linearSemanticFallback(prompt, stale, qvec)` which is the ORIGINAL body (load 137MB _embeddings.jsonl + cosineAgainstCorpus linear scan). REUSES the already-embedded qvec so it never embeds twice.
   - Added qdrantRankWiki/readEmbMeta/semanticFallback to the module exports.
2. H:/prism/.claude/hooks/wiki-precheck-inject.test.mjs -- 6 new tests for qdrantRankWiki + a source-wiring guard (40/40 total green).

CONTRACT:
- WHY: the old semanticFallback loaded the 137MB _embeddings.jsonl + linear-scanned 53,930x768 int8 vectors on every paraphrase miss. The Qdrant ANN primary skips that load entirely (prism_wiki collection is live: 53,930 vectors, dim 768, Cosine).
- Cosine is direction-only, so Qdrant's score == the linear path's cosine; SEM_MIN_COSINE (0.62) is applied via score_threshold. The hit shape {n,t,cos} matches what the renderer consumes (h.t optional, so t:"" is fine).
- Default ON; PRISM_WIKI_QDRANT_DISABLE=1 must restore EXACT original behavior.
- Live status (honest): unit tests 40/40; the in-process E2E is currently blocked by nomic-embed-text being GPU-starved by a resid
... [+1176 chars truncated]

### Assistant | 2026-06-11T03:04:09.424Z

I'll review this hook consumer rewire. Let me read both files end to end.

### Assistant | 2026-06-11T03:04:09.911Z

[tool_use: Read]

### Assistant | 2026-06-11T03:04:10.353Z

[tool_use: Read]

### User | 2026-06-11T03:04:12.428Z

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
... [+39411 chars truncated]

### User | 2026-06-11T03:04:12.447Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * wiki-precheck-inject.test.mjs — node:test suite for wiki-precheck-inject.mjs.
4	 *
5	 * Primary coverage: the WIKI-INJECT-MS0 embeddings-staleness guard
6	 * (embeddingStaleness / staleFooterNote / the embStale wiring through
7	 * semanticFallback → main → logMiss). Also pins the BM25/boost matched path so
8	 * the guard edits can't silently break the happy path.
9
... [+25538 chars truncated]

### Assistant | 2026-06-11T03:04:18.963Z

I've read both files end to end. Let me verify the one external dependency the contract leans on — that `linearSemanticFallback` is genuinely byte-equivalent to the pre-rewire `semanticFallback` body, by checking git history.

### Assistant | 2026-06-11T03:04:19.765Z

[tool_use: Bash]

### User | 2026-06-11T03:04:26.885Z

[tool_result] 2930cce3c9 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [GALAXY-CONTEXT-FEDERATION-MS0]/U-WIKI-SLOT-DOMAIN-BOOST (slot:alpha): wiki-precheck domain boost now slot-identity-aware (sibling of U-TRIBAL-SLOT-DOMAIN-WIRE). Topicless slot/<name> chats got no domain wiki boost; now the slots canonical domain (mill/lathe/wedm/cad/cam) augments domainTokens. Single-sourced from tribal hooks exported SLOT_TRIBAL_DOMAIN 
... [+3777 chars truncated]

### Assistant | 2026-06-11T03:05:21.662Z

The git diff confirms the exact behavior-preservation claim. The original body was:

```js
async function semanticFallback(prompt) {
  const corpus = loadEmbeddings();
  if (!corpus || !corpus.entries.length) return null;
  const stale = computeEmbStaleness();
  const headerCount = corpus.headerCount || corpus.entries.length;
  const generatedAt = corpus.generatedAt || "";
  const qvec = await ollamaEmbedQuery(corpus.model, prompt);
  if (!qvec) return { ok: false, reason: "ollama_down", stale, headerCount, generatedAt };
  const hits = cosineAgainstCorpus(qvec, corpus, TOP_K);
  return { ok: true, hits, stale, headerCount, generatedAt };  // (denseArm:"scan" is new, additive)
}
```

I've now verified everything I need. Here is my review.

---

## Code Quality Analysis Report — HMEMV09 Qdrant-ANN rewire

### Summary
- Files analyzed: 2 (`wiki-precheck-inject.mjs`, `wiki-precheck-inject.test.mjs`)
- Verdict: **PASS** (no P0, no P1)
- Reviewed against: live git diff of the changed region, the disable-knob revert contract, fail-safe blast-radius (26 concurrent slots), and the empty-result distinction.

---

### FAIL-SAFE — can any new path throw out of `main()`? — PASS

`qdrantRankWiki` (`wiki-precheck-inject.mjs:463-489`) cannot throw or hang:
- The whole network body is inside `try { ... } catch { return null; }` — `fetchImpl` throw (ECONNREFUSED/DNS), `res.json()` reject (malformed body), and the `j.result` access all land in the catch. Test `:448-453` proves the throw path returns `null`.
- The pre-fetch guard `if (!Array.isArray(qvec) || qvec.length === 0) return null;` (`:464`) returns *before* allocating the AbortController/timer, so the empty-vector path leaks nothing (test `:440-446` asserts no network call).
- Timeout is bounded: `setTimeout(() => ctrl.abort(), timeoutMs)` with `timeoutMs` defaulting to `WIKI_QDRANT_TIMEOUT_MS` (clamped `Math.max(200, ...)` at `:102`). `clearTimeout(t)` is in `finally`, so the timer is always cleared whether the fetch resolve
... [+7663 chars truncated]
