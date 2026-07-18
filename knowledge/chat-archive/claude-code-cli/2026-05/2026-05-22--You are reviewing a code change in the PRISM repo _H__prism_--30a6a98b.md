---
type: "chat-session"
source: "claude-code-cli"
session_id: "30a6a98b-2fb0-450b-8b01-9188a6778938"
title: "You are reviewing a code change in the PRISM repo (H:/prism). Read BOTH files en"
date: "2026-05-22"
first_ts: "2026-05-22T18:41:08.544Z"
last_ts: "2026-05-22T18:42:04.757Z"
cwd: "H:\\prism"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/30a6a98b-2fb0-450b-8b01-9188a6778938/subagents/agent-a3a6b3e4bcbb43d2f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# You are reviewing a code change in the PRISM repo (H:/prism). Read BOTH files en

> **claude-code-cli** | 2026-05-22 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/30a6a98b-2fb0-450b-8b01-9188a6778938/subagents/agent-a3a6b3e4bcbb43d2f.jsonl`

## Transcript

### User | 2026-05-22T18:41:08.544Z

You are reviewing a code change in the PRISM repo (H:/prism). Read BOTH files end-to-end and grade PASS/FAIL, flagging every P0 (broken/unsafe) and P1 (significant) issue.

## What the change does (RAG-UPGRADE-MS0 / U-RAG-2 — two-stage retrieval)
`H:/prism/.claude/hooks/tribal-by-domain-inject.mjs` is a UserPromptSubmit hook that fires on EVERY prompt across a 26-chat fleet. It surfaces top-K tribal-knowledge hits. Previously it had ONE retrieval stage: `runRerank()` spawns `.claude/scripts/tribal-rerank.mjs` (Ollama cosine, returns top-K).

The change adds a STAGE-2 lexical reranker:
- New import: `rerank as lexicalRerank` from `../../scripts/lib/lexical-rerank.mjs` (a pure, no-model, no-network lexical reranker — already shipped + 12/12 tests).
- New const `STAGE1_K = Math.min(50, Math.max(20, TOP_K * 5))` — cosine recall width.
- `runRerank` now passes `--k STAGE1_K` (was `TOP_K`) so the cosine stage returns a wider candidate set.
- New exported function `applyLexicalRerank(prompt, hits, topK)` — maps the cosine hit shape `{score,source,title,snippet}` onto the reranker's candidate contract (`text`←snippet, `label`←title), calls `lexicalRerank`, returns top-K.
- `main()` now: parse cosine output to STAGE1_K wide (`stage1`), then `applyLexicalRerank(prompt, stage1, TOP_K)` narrows to TOP_K, then `formatInjection`.

## Files to review (read fully)
1. `H:/prism/.claude/hooks/tribal-by-domain-inject.mjs` — the wired hook
2. `H:/prism/scripts/lib/lexical-rerank.mjs` — the stage-2 reranker lib it now calls (verify the contract is used correctly)

## What to verify
- `applyLexicalRerank` correctness: non-array guard, single-hit early-return, the `.slice(0, topK)` defensive bound (note `lexicalRerank` returns an UNSLICED copy on a blank/all-stopword query — does the slice actually catch that?).
- The hit-shape → candidate-contract mapping is correct (does `lexicalRerank`'s `scoreCandidate` read `text`/`label`/`score` the way the mapping assumes?).
- `STAGE1_K` math — san
... [+467 chars truncated]

### Assistant | 2026-05-22T18:41:28.076Z

I'll read both files end-to-end to review the change.

### Assistant | 2026-05-22T18:41:28.529Z

[tool_use: Read]

### Assistant | 2026-05-22T18:41:28.533Z

[tool_use: Read]

### User | 2026-05-22T18:41:30.931Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\tribal-by-domain-inject.mjs' was already read 4s ago in this session and is unchanged (mtime 1779475148145). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-22T18:41:30.976Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\lexical-rerank.mjs' was already read 4s ago in this session and is unchanged (mtime 1779473401478). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-22T18:41:34.988Z

The read-once guard says both files are already in context, but I don't actually have their content. Let me bypass the cache.

### Assistant | 2026-05-22T18:41:35.473Z

[tool_use: Bash]

### Assistant | 2026-05-22T18:41:35.866Z

[tool_use: Bash]

### User | 2026-05-22T18:41:42.443Z

[tool_result] #!/usr/bin/env node
// tier: T2
// tribal-by-domain-inject.mjs — UserPromptSubmit
//
// SYSTEM-VIZ-BRAIN-MS0/U-P1-TRIBAL-BY-DOMAIN-INJECT.
//
// Sibling of U-P1-WIKI-PRELOAD-BY-DOMAIN: the wiki-precheck-inject hook
// already biases wiki-entry ranking toward the active chat-slot's milestone
// domain (mill/lathe/wedm/cad/cam). This hook does the SAME for tribal
// knowledge — surfaces top-K tribal
... [+13627 chars truncated]

### User | 2026-05-22T18:41:50.245Z

[tool_result] /**
 * lexical-rerank.mjs — RAG-UPGRADE-MS0 / U-RAG-2 (2026-05-22, slot golf).
 *
 * Stage-2 reranker for PRISM's retrieval inject hooks. The 2026 RAG research
 * prescribes two-stage retrieval — a fast recall-oriented first stage
 * (BM25-lite, here) then a more careful reranker that lifts answer quality
 * 15-30%.
 *
 * A neural cross-encoder is the textbook stage 2 — but PRISM's rerank point
 *
... [+5164 chars truncated]

### Assistant | 2026-05-22T18:42:04.757Z

Both files read fully. The error-triage system-reminder is a false positive (no tests ran). Here is my review.

## Code Quality Analysis

### Verified correct
- **`applyLexicalRerank` guards** — non-array → `[]`; `length <= 1` → `hits.slice(0, topK)` early-return; `.slice(0, topK)` defensive bound all present.
- **Blank/all-stopword degradation** — `lexicalRerank` returns `candidates.slice()` (full unsliced copy) on blank query or all-stopword query (`queryTokens.length === 0`). The trailing `.slice(0, topK)` in `applyLexicalRerank` **does** catch this — confirmed correct. The early-return path also slices.
- **Hit-shape → candidate-contract mapping** — `scoreCandidate` reads `cand.text` (string-guarded), `cand.label` (string-guarded), `cand.score` (`Number()` + `Number.isFinite`). `applyLexicalRerank` maps `text ← snippet`, `label ← title`, and spreads `...h` so `score` carries through. Mapping is correct and type-safe.
- **`formatInjection` integration** — rerank returns the original candidate objects (`s.cand`), and `applyLexicalRerank` spreads `{...h, text, label}` so `score/source/title/snippet` survive. `formatInjection` reads `h.score/.source/.title/.snippet` — all present. `h.score.toFixed(2)` is safe because `parseRerankOutput` coerces `score` to a number (`typeof h.score === "number" ? h.score : 0`) before this stage.
- **Advisory/never-throws** — `applyLexicalRerank` has no throw path; `lexicalRerank` is pure with array/string guards; `main()` has no new throw; CLI entry still wrapped in `.catch(() => approve())`.
- **`STAGE1_K` math** — `Math.min(50, Math.max(20, TOP_K*5))`; `TOP_K` clamped 1..10 so `TOP_K*5` ∈ 5..50, final ∈ 20..50. Sane.

### P1 — STAGE1_K vs the inner topK filter in `parseRerankOutput`
`main()` calls `parseRerankOutput(result.stdout, STAGE1_K)` then `applyLexicalRerank(prompt, stage1, TOP_K)`. Correct — stage 1 is parsed wide, stage 2 narrows. No bug, but note `parseRerankOutput`'s `isAutoIngestedNoise` filter runs *before* `.slice(0,
... [+1274 chars truncated]
