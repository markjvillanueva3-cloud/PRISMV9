---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c0bd535-0ecb-4744-9e62-ac1ea40fbe71"
title: "Review TWO new files end-to-end. Grade PASS/FAIL. FILES: 1. H:/prism/scripts/lib"
date: "2026-05-26"
first_ts: "2026-05-26T14:58:47.033Z"
last_ts: "2026-05-26T15:06:48.539Z"
cwd: "H:\\prism"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/5c0bd535-0ecb-4744-9e62-ac1ea40fbe71/subagents/agent-a7408fca4ba092d30.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Review TWO new files end-to-end. Grade PASS/FAIL. FILES: 1. H:/prism/scripts/lib

> **claude-code-cli** | 2026-05-26 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5c0bd535-0ecb-4744-9e62-ac1ea40fbe71/subagents/agent-a7408fca4ba092d30.jsonl`

## Transcript

### User | 2026-05-26T14:58:47.033Z

Review TWO new files end-to-end. Grade PASS/FAIL.

FILES:
1. H:/prism/scripts/lib/cag-router.mjs — pure-fn library that classifies a user query as COLD / HOT / HYBRID for the Cache-Augmented Generation (CAG) pattern.
2. H:/prism/scripts/lib/cag-router.test.mjs — node:test suite (39/39 passing).

UNIT GOAL: PRISM auto-injects ~92KB of static doctrine (CLAUDE.md + MEMORY.md + ENGINE_DIGEST.md + DISPATCHER_DIGEST.md) on every UserPromptSubmit even when the query is about live state. The CAG router classifies the query so a downstream hook can skip cold injects when the query is purely live-state, OR skip live retrieval when the query is purely doctrine. Concept = akshay_pachaar X tweet (RAG vs CAG). Composes with master-index-search-lib.mjs (same key-set) and prompt-cache work referenced in knowledge/wiki/software-engineering/prompt-engineering-rails.md. The doc-header is // JSDoc-style — NOT commented-out code (ignore false-positive warnings).

FOCUS on:
- Silent breakage / regression risk if classification is wrong downstream
- I/O security (none expected — pure-fn — verify no hidden FS/fetch)
- Hostile-payload exposure: 10MB query? regex metachars? unicode? control chars?
- Error budget: classifyQuery per UserPromptSubmit — worst-case latency? pathological pattern?
- First-match-wins ordering: deterministic across all reasonable inputs?
- Test integrity: are any tests tautological stubs?

Verify: `cd H:/prism && node --test scripts/lib/cag-router.test.mjs` (already 39/39 pass)

Report under 400 words. Use [P0/P1/P2/P3] tags. End with verdict PASS or FAIL.

### Assistant | 2026-05-26T14:59:00.581Z

I'll review both files end-to-end.

### Assistant | 2026-05-26T14:59:00.998Z

[tool_use: Read]

### User | 2026-05-26T14:59:23.291Z

[tool_result] 1	// scripts/lib/cag-router.mjs
2	//
3	// CAG-Router — Classify a query as COLD (cache-augmented), HOT (retrieval-augmented),
4	// or HYBRID (both layers). Implements the Cache-Augmented Generation pattern
5	// (akshay_pachaar X tweet 2056714042455343160, 2026-05-19; foundational paper
6	// Chan et al. 2024 "Don't Do RAG: When Cache-Augmented Generation is All You Need").
7	//
8	// PURPOSE
9	// PR
... [+19238 chars truncated]

### Assistant | 2026-05-26T14:59:26.979Z

[tool_use: Read]

### User | 2026-05-26T15:00:06.430Z

[tool_result] 1	// scripts/lib/cag-router.test.mjs
2	//
3	// Tests for cag-router.mjs — CAG (Cache-Augmented Generation) query classifier.
4	// Run: node --test H:/prism/scripts/lib/cag-router.test.mjs
5	//
6	// Test surfaces:
7	//   1. classifyQuery — tier resolution + confidence + source extraction
8	//   2. summarize — 1-line hook injection format
9	//   3. coldSourcesFor — convenience accessor
10	//   4. es
... [+13488 chars truncated]

### Assistant | 2026-05-26T15:00:10.266Z

Now let me check a quick latency profile to verify the worst-case behavior under hostile input.

### Assistant | 2026-05-26T15:00:16.725Z

[tool_use: Bash]

### User | 2026-05-26T15:05:47.584Z

[tool_result] Command running in background with ID: bzqo1i515. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\5c0bd535-0ecb-4744-9e62-ac1ea40fbe71\tasks\bzqo1i515.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-26T15:05:51.772Z

[tool_use: Read]

### User | 2026-05-26T15:06:25.577Z

[tool_result] 1	10MB query latency_ms: 2760 tier: HYBRID queryLen: 8700000
2	50KB aaa query latency_ms: 7 tier: HYBRID
3	ctrl tier: HOT
4	1000x typical query total_ms: 130
5	

### Assistant | 2026-05-26T15:06:48.539Z

## Code Quality Analysis — cag-router.mjs + .test.mjs

### Summary
- Files: 2 (423-line lib + 316-line test)
- Tests: 39/39 PASS, deterministic
- Quality: 8.5/10 — disciplined pure-function library with proper escape, frozen registry, doctrine citations

### Findings

**[P2] 10MB query worst-case latency = 2760ms** — Empirically measured: a 10MB pathological query (heavy keyword soup) takes ~2.8s. With ~280 total keywords × O(n) regex/substring per scan, latency grows linearly with query length. Typical queries (1000x in 130ms = 0.13ms each) are fine. UserPromptSubmit budget is usually <100ms — a hostile or accidentally-pasted megablob would push past it. Mitigation: add a `MAX_QUERY_BYTES` guard (e.g., 64KB) at the top of `normalize()`, truncating with a note in evidence. Not a security hole (no ReDoS — single `\b...\b` alternation), just a budget concern.

**[P2] Tie-break branch is unreachable in current scoring** — `preferColdOnTie` is exposed as a public option but `coldScore === hotScore` requires both > 0, which routes to HYBRID via line 288 first. The dedicated tie branch (line 298-300) is dead code. The test `respects preferColdOnTie option` is therefore tautological — both calls use empty string which hits the empty-query early return. Either remove the branch + option, or change ordering so `preferColdOnTie` actually fires.

**[P2] Confidence inflation on stacked cold keywords** — A `CLAUDE.md` query naming every doctrine term gives confidence 0.94 (verified by the clamps-below-1 test). Downstream `estimateSavings` claims 12k tokens saved at ≥0.4 confidence. A user typing one accidental doctrine word ("doctrine") past a HOT query could downgrade injection. Acceptable given preferColdOnTie default, but worth a tighter `confidenceFloor` for the `estimateSavings` COLD branch.

**[P3] Slot intent detection is generous** — Any bare NATO word (`alpha`, `bravo`...) forces hot routing to chat-slots. A doctrine query mentioning "the alpha rule" routes hot. Low-imp
... [+661 chars truncated]
