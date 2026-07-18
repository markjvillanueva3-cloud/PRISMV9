---
type: "chat-session"
source: "claude-code-cli"
session_id: "a61bbf34-4093-44f3-a8af-e68d61dc41a9"
title: "Review this newly-created PRISM helper module end-to-end for a per-file scrutiny"
date: "2026-05-15"
first_ts: "2026-05-15T17:46:28.659Z"
last_ts: "2026-05-15T17:47:37.585Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-a4d51819372e04620.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Review this newly-created PRISM helper module end-to-end for a per-file scrutiny

> **claude-code-cli** | 2026-05-15 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-a4d51819372e04620.jsonl`

## Transcript

### User | 2026-05-15T17:46:28.659Z

Review this newly-created PRISM helper module end-to-end for a per-file scrutiny gate before next file is written:

File: H:/prism/.claude/helpers/wiki-domain-bias.mjs

Context — this is a small additive helper for the existing `wiki-precheck-inject.mjs` (a UserPromptSubmit hook that injects relevant wiki entries via BM25 over knowledge/wiki/index.md + _leaf-index.jsonl with semantic-cosine fallback). My new helper exports 3 functions:
- `getDomainTokens({chatId})` — reads `state/shared/chat-slots.json` to find this chat's slot, extracts tokens from the slot's `topic` and `branch` (stripping `work/` prefix), plus tokens from the first H1 of `state/CURRENT_POSITION.md`. Strips a stopword list. Returns a string[] of domain tokens.
- `domainBoostFor(entry, domainTokens)` — returns an additive numeric boost (in BM25 score units) for a wiki entry whose `toks` / `source` / `category` overlap the domain tokens. Constants: BOOST_PER_HIT=1.5, BOOST_PATH_WEIGHT=0.5.
- `chatIdFromInput(input)` — derives `claude-<8hex>` chatId from a UserPromptSubmit input's `session_id`.

Knob: `PRISM_WIKI_DOMAIN_BIAS_DISABLE=1` → returns empty domain tokens (no behavior change).

Grade PASS/FAIL with a P0/P1/P2/P3 punch list. Focus on:
1. **Edge cases & correctness** — empty/missing files, malformed JSON, non-string topic/branch fields, claude-id not matching `[0-9a-f]{8}`, slot topic = null vs empty string, mixed-case domain tokens, the strip-branch-prefix regex.
2. **Performance** — this runs on EVERY UserPromptSubmit; readFileSync of two files per call (chat-slots.json + CURRENT_POSITION.md) — acceptable or should we cache by mtime?
3. **Adversarial inputs** — what if `entry.toks` is undefined / not an array? `domainTokens` is null?
4. **Boost numeric tuning** — does BOOST_PER_HIT=1.5 risk swamping the existing BM25 MIN_SCORE=4.0 / boost-keyword BASE_SCORE=12.0 already in wiki-precheck-inject.mjs (you can read that file to compare)?
5. **API ergonomics** — is the export surface right? Anyt
... [+508 chars truncated]

### Assistant | 2026-05-15T17:46:34.419Z

I'll review the helper module and compare it against the existing wiki-precheck-inject.mjs to ground the boost-tuning analysis.

### Assistant | 2026-05-15T17:46:34.789Z

[tool_use: Read]

### User | 2026-05-15T17:46:47.291Z

[tool_result] 1	#!/usr/bin/env node
2	// wiki-domain-bias.mjs
3	// SYSTEM-VIZ-BRAIN-MS0/U-P1-WIKI-PRELOAD-BY-DOMAIN
4	//
5	// Surgical helper for wiki-precheck-inject.mjs — biases the BM25 score of wiki
6	// candidates toward the *active milestone domain* so a chat working on
7	// SYSTEM-VIZ-BRAIN-MS0 sees system-viz wiki entries ranked higher than
8	// generically-matching ones.
9	//
10	// Domain tokens are de
... [+5003 chars truncated]

### Assistant | 2026-05-15T17:46:52.007Z

I have the file content. Let me read the existing wiki-precheck-inject.mjs to ground the boost-tuning analysis against actual constants.

### Assistant | 2026-05-15T17:46:52.237Z

[tool_use: Read]

### User | 2026-05-15T17:46:55.689Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\wiki-precheck-inject.mjs' was already read 3m ago in this session and is unchanged (mtime 1778767251434). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-15T17:46:59.841Z

[tool_use: Grep]

### User | 2026-05-15T17:47:04.677Z

[tool_result] 16: * BM25 token overlap is weak. Injected context is capped at MAX_INJECT_BYTES
49:const MIN_SCORE = 4.0;
51:const TOP_K = 3;
57:const MAX_INJECT_BYTES = 8192;   // hard cap on injected additionalContext (8 KB)
58:const BOOST_BASE_SCORE = 12.0;   // synthetic score for a single boost-keyword hit — curated, beats typical BM25
59:const BOOST_PER_KEYWORD = 3.0;   // + per additional matched boost ke
... [+976 chars truncated]

### Assistant | 2026-05-15T17:47:37.585Z

Good — I have all the comparison data. Here's the review.

## Code Quality Analysis Report — `wiki-domain-bias.mjs`

### Verdict: **PASS with P1 fixes required before tests/wiring land**

Clean module, good pure-function separation, sensible knob. Concerns below are mostly defensive.

---

### P0 — none

### P1 (fix before next file)

1. **`stripBranchPrefix` regex strips too aggressively.** `^(?:work|feat|fix|...)\/+` will also strip a real prefix like `work/cad-fusion-...` (intended) but the `fix` alternation will eat any branch starting with `fix-something` — wait, no, the `\/+` requires a slash, so that's safe. However, the regex is anchored with `^` but lacks word-boundary discipline: `worktree/foo` matches `work`+slash? No, slash separator required. Actually safe. **Withdraw.**

2. **Boost can swamp the synthetic boost-keyword path.** `BOOST_BASE_SCORE=12.0` (curated keywords) is intended to dominate. Your domain boost adds *post-score* — a regular BM25 candidate with score 8 + 3 domain hits = 12.5 will now tie/beat a curated boost-keyword entry. **Mitigation:** cap total domain boost at `< BOOST_PER_KEYWORD` (3.0), e.g. `Math.min(rawBoost, 2.9)`, OR document the intentional override. Recommend explicit `MAX_DOMAIN_BOOST = 4.5` cap (3 hits max contribution) — comment claims "~+6 (4 hits)" but that's already past the curated tier.

3. **`entry.source` tokenized via `tokenize()` which applies stopwords** — `data`, `src` are stopwords, so `knowledge/wiki/architecture/foo.md` loses `architecture` if it ever became stopworded. Today safe; flag for future. Also: paths use `/` as natural separator; the `[a-z][a-z0-9-]{1,}` regex handles it, but consider splitting on `/` first to avoid weird concatenations like `wikiarchitecture`. Current regex is safe — paths contain slashes, slashes break tokens. Confirmed safe.

4. **`chatIdFromInput` swallows uppercase silently** — case-insensitive regex match passes but `.toLowerCase()` is applied AFTER. Fine. But `session_id` sh
... [+2496 chars truncated]
