---
type: "chat-session"
source: "claude-code-cli"
session_id: "30a6a98b-2fb0-450b-8b01-9188a6778938"
title: "Independent second-pass review of a code change in the PRISM repo (H:/prism). Re"
date: "2026-05-22"
first_ts: "2026-05-22T18:41:08.576Z"
last_ts: "2026-05-22T18:41:43.873Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/30a6a98b-2fb0-450b-8b01-9188a6778938/subagents/agent-a20b3614768fb4d99.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Independent second-pass review of a code change in the PRISM repo (H:/prism). Re

> **claude-code-cli** | 2026-05-22 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/30a6a98b-2fb0-450b-8b01-9188a6778938/subagents/agent-a20b3614768fb4d99.jsonl`

## Transcript

### User | 2026-05-22T18:41:08.576Z

Independent second-pass review of a code change in the PRISM repo (H:/prism). Read all THREE files end-to-end. Grade PASS/FAIL, flag every P0/P1 issue. Weight your review toward what a correctness-focused first reviewer is LIKELY TO MISS: test integrity, the import path, naming/convention conformance, hidden coupling, and the every-prompt-fleet-wide blast radius.

## The change (RAG-UPGRADE-MS0 / U-RAG-2 — stage-2 lexical reranker)
`.claude/hooks/tribal-by-domain-inject.mjs` (a UserPromptSubmit hook firing on EVERY prompt across a 26-chat fleet) gained a second retrieval stage. Stage 1 = an existing Ollama cosine pass (`tribal-rerank.mjs`, recall-oriented). Stage 2 (NEW) = a pure lexical reranker `applyLexicalRerank(prompt, hits, topK)` that re-scores the cosine candidates and narrows to TOP_K. New const `STAGE1_K` widens the cosine recall set. The reranker lib `scripts/lib/lexical-rerank.mjs` is pre-shipped (no model, no network).

## Files (read fully)
1. `H:/prism/.claude/hooks/tribal-by-domain-inject.mjs` — the wired hook
2. `H:/prism/.claude/hooks/tribal-by-domain-inject.test.mjs` — node:test suite, 7 new `applyLexicalRerank` cases added
3. `H:/prism/scripts/lib/lexical-rerank.mjs` — the stage-2 lib

## What to verify
- TEST INTEGRITY (most important): do the 7 new `applyLexicalRerank` tests verify INTENT, not just behavior? Specifically the "re-ranks: a strong lexical match beats a higher-cosine non-match" test — would it actually FAIL if `applyLexicalRerank` degraded to a pass-through? Are there missing edge cases (topK=0? duplicate hits? hits missing snippet/title)?
- The import path `../../scripts/lib/lexical-rerank.mjs` — resolve it from `.claude/hooks/`: is it correct? (repo root is H:/prism.)
- The module-load smoke test now asserts `applyLexicalRerank` is exported — present?
- Convention conformance: comment density, naming, knob style vs the surrounding file.
- Hidden coupling: does adding `text`/`label` fields to the hit objects leak anywhere downstre
... [+439 chars truncated]

### Assistant | 2026-05-22T18:41:23.121Z

I'll review all three files end-to-end.

### Assistant | 2026-05-22T18:41:23.617Z

[tool_use: Read]

### Assistant | 2026-05-22T18:41:23.842Z

[tool_use: Read]

### Assistant | 2026-05-22T18:41:23.889Z

[tool_use: Read]

### User | 2026-05-22T18:41:27.761Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// tribal-by-domain-inject.mjs — UserPromptSubmit
4	//
5	// SYSTEM-VIZ-BRAIN-MS0/U-P1-TRIBAL-BY-DOMAIN-INJECT.
6	//
7	// Sibling of U-P1-WIKI-PRELOAD-BY-DOMAIN: the wiki-precheck-inject hook
8	// already biases wiki-entry ranking toward the active chat-slot's milestone
9	// domain (mill/lathe/wedm/cad/cam). This hook does the SAME for tribal
10	// knowledge — 
... [+14664 chars truncated]

### User | 2026-05-22T18:41:28.014Z

[tool_result] 1	#!/usr/bin/env node
2	// tribal-by-domain-inject.test.mjs — hermetic node:test suite
3	//
4	// Pure-function tests for extractPrompt / inferTribalDomain /
5	// parseRerankOutput / formatInjection. No Ollama / no subprocess.
6	//
7	// Run: node --test H:/prism/.claude/hooks/tribal-by-domain-inject.test.mjs
8	
9	import { describe, it } from "node:test";
10	import assert from "node:assert/strict";

... [+16337 chars truncated]

### User | 2026-05-22T18:41:28.098Z

[tool_result] 1	/**
2	 * lexical-rerank.mjs — RAG-UPGRADE-MS0 / U-RAG-2 (2026-05-22, slot golf).
3	 *
4	 * Stage-2 reranker for PRISM's retrieval inject hooks. The 2026 RAG research
5	 * prescribes two-stage retrieval — a fast recall-oriented first stage
6	 * (BM25-lite, here) then a more careful reranker that lifts answer quality
7	 * 15-30%.
8	 *
9	 * A neural cross-encoder is the textbook stage 2 — but PRISM
... [+5597 chars truncated]

### Assistant | 2026-05-22T18:41:43.873Z

All three files reviewed end-to-end.

## Findings

**P1 — `applyLexicalRerank` mutates the input array's element objects (hidden coupling)**
`tribal-by-domain-inject.mjs:237` — `hits.map((h) => ({ ...h, text: ..., label: ... }))` spreads each hit, but `lexicalRerank` returns those *same wrapped objects* (`lexical-rerank.mjs:133` returns `s.cand`, where `cand` is the wrapped object). So the injected hits carry extra `text`/`label` fields. `formatInjection` ignores them (only reads `score/source/title/snippet`), so no visible break — but the doc comment claims a clean `{score,source,title,snippet}` shape mapping, and the test `preserves the cosine hit shape` (line 304) only asserts those 4 fields *exist*, never that `text`/`label` are *absent*. Telemetry at line 277 logs only `hits.length`, so no leak there. **Verdict: cosmetic leak, not a bug** — but the test gives false confidence the shape is clean. Recommend the test assert `h.text === undefined` OR strip the extra fields after rerank. Borderline P1/P2.

**P1 — `parseRerankOutput` never emits a `text` field, so `text` in the spread at line 237 is always the *snippet* — but the test feeds `text` directly.**
The test at line 281 builds hits with `snippet:` (correct). Production path: `parseRerankOutput` maps `h.text → snippet` (line 213) and drops raw `text`. So `h.snippet` is the real signal carrier. The spread `text: h.snippet || ""` is correct. **No bug** — but worth noting the naming collision (`text` means raw-rerank-output upstream, reranker-input downstream) is a readability trap. Not blocking.

## Verification of requested items — all PASS

- **Import path** `../../scripts/lib/lexical-rerank.mjs` from `H:/prism/.claude/hooks/` → `H:/prism/scripts/lib/lexical-rerank.mjs`. Correct.
- **Smoke test** asserts `applyLexicalRerank` exported — present, line 86.
- **Re-rank intent test** (line 274): would genuinely FAIL on pass-through. Pass-through keeps A first (cosine 0.9>0.5); the test asserts `out[0].source === 
... [+1543 chars truncated]
