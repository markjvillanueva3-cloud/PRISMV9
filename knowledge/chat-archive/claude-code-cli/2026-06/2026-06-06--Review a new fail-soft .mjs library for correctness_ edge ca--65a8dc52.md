---
type: "chat-session"
source: "claude-code-cli"
session_id: "65a8dc52-2895-48bf-9137-68cade042012"
title: "Review a new fail-soft .mjs library for correctness, edge cases, and silent brea"
date: "2026-06-06"
first_ts: "2026-06-06T05:57:18.455Z"
last_ts: "2026-06-06T05:58:31.340Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/65a8dc52-2895-48bf-9137-68cade042012/subagents/agent-a3b3c211bdb13cc72.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Review a new fail-soft .mjs library for correctness, edge cases, and silent brea

> **claude-code-cli** | 2026-06-06 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/65a8dc52-2895-48bf-9137-68cade042012/subagents/agent-a3b3c211bdb13cc72.jsonl`

## Transcript

### User | 2026-06-06T05:57:18.455Z

Review a new fail-soft .mjs library for correctness, edge cases, and silent breakage. Read BOTH files end-to-end:

1. THE FILE UNDER REVIEW: `H:/prism/scripts/lib/source-chain-lib.mjs`
2. THE CANONICAL ENGINE IT MIRRORS: `H:/prism/mcp-server/src/engines/SourceChainEngine.ts`

CONTRACT this lib must satisfy:
- It is a dependency-light (.mjs, only node:crypto) mirror of SourceChainEngine's PURE core, because the per-prompt inject hooks in .claude/hooks/ are bare .mjs and CANNOT import the TypeScript engine.
- **BYTE-PARITY REQUIREMENT (critical):** `digest()`, `renderMarkdown()`, and `decorate(value, validCitations).digest` MUST produce output byte-identical to `SourceChainEngine.digest`, `SourceChainEngine.renderMarkdown`, and `SourceChainEngine.decorate` respectively, FOR VALID citations. Read the TS implementations line-by-line and confirm: (a) digest sorts by path.localeCompare then canonicalizes ONLY {path, source_type, score:??null} as JSON then sha256-hex; (b) renderMarkdown empty→"_(no sources cited)_", header "**Sources:**", line shape `- [type] \`path\` (score=x.xxx) — used_for` with score.toFixed(3) only when typeof score==="number" and used_for only when truthy. Flag ANY divergence that would make a parity test fail.
- **Deliberate divergence (allowed):** the TS engine THROWS (Zod .parse) on invalid citations; this lib FAILS SOFT (normalizeCitation salvages + flags provenance:"unverified", never throws). This divergence is intended and correct ONLY for invalid inputs — verify valid inputs still match.
- `decorateHits(hits, kind, opts)` must be ADDITIVE + NON-MUTATING (spread into new objects; originals untouched), pass-through on PRISM_SOURCE_CHAIN_DISABLE=1 or unknown kind, and never throw on null/garbage hits.

Specifically verify/refute:
1. Does `digest` match the TS `digest` for valid citations? (canonical shape, sort, hash)
2. Does `renderMarkdown` match the TS `renderMarkdown` exactly?
3. Edge cases: empty array, null/undefined citations, hit with no
... [+440 chars truncated]

### Assistant | 2026-06-06T05:57:32.807Z

I'll review both files end-to-end, starting with the file under review and the canonical engine it mirrors.

### Assistant | 2026-06-06T05:57:33.271Z

[tool_use: Read]

### Assistant | 2026-06-06T05:57:33.436Z

[tool_use: Read]

### User | 2026-06-06T05:57:36.785Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\SourceChainEngine.ts' was already read 8m ago in this session and is unchanged (mtime 1779604497847). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-06T05:57:40.161Z

[tool_result] 1	#!/usr/bin/env node
2	// source-chain-lib.mjs — fail-soft .mjs mirror of SourceChainEngine's pure core,
3	// for the RETRIEVAL / INJECT path (hooks + scripts that cannot import the TS engine).
4	//
5	// WHY A MIRROR (not import the engine): SourceChainEngine.ts lives in
6	// mcp-server/src/engines/ and pulls in TypeScript + Zod + node:crypto. The
7	// per-prompt knowledge-inject hooks in .claude
... [+11383 chars truncated]

### Assistant | 2026-06-06T05:57:43.134Z

The read-once guard says I already have the TS engine in context, but the guard is mistaken about it being usable from a prior turn — I need the actual TS content to do a line-by-line parity check. Let me read it explicitly bypassing the cache.

### Assistant | 2026-06-06T05:57:44.075Z

[tool_use: Read]

### User | 2026-06-06T05:57:59.555Z

[tool_result] 0	/**
1	 * SourceChainEngine — provenance / "why retrieved" trace decorator
2	 *
3	 * Closes Voxyz Layer 8 gap (https://x.com/Voxyz_ai/status/2058222816474919343):
4	 *   "Finding the right thing + citing the source is what makes the answer trustworthy."
5	 *
6	 * Every retrieval through PSN (master-index hits, tribal lookups, wiki backlinks,
7	 * memory queries, dispatcher round-trips) can wrap i
... [+6896 chars truncated]

### Assistant | 2026-06-06T05:58:31.340Z

I now have both files fully in context. Let me do the line-by-line parity verification.

**Parity check 1 — `digest()`:**

TS (lines 147-157): `sorted = [...citations].sort((a,b) => a.path.localeCompare(b.path))`, then maps to `{path: c.path, source_type: c.source_type, score: c.score ?? null}`, `JSON.stringify`, sha256 hex.

MJS (lines 57-68): sorts by `String(a?.path).localeCompare(String(b?.path))`, maps to `{path: c?.path, source_type: c?.source_type, score: c?.score ?? null}`, same stringify + hash. For valid citations (`path` is a non-empty string), `String(c.path) === c.path` and `c?.path === c.path`, so the canonical shape and order are byte-identical. **MATCH.**

**Parity check 2 — `renderMarkdown()`:**

TS (163-172) vs MJS (79-89): empty→`"_(no sources cited)_"`, header `"**Sources:**"`, line `- [${source_type}] \`${path}\`${scoreStr}${usedFor}` with `score.toFixed(3)` gated on `typeof === "number"` and `used_for` gated on truthiness, joined with `\n`. **MATCH.**

**Parity check 3 — `decorate().digest` for valid citations:**

For a valid citation, `normalizeCitation` preserves `path`, `source_type`, `score` unchanged (score in [0,1] kept; valid path/type kept), and `digest()` only reads those three fields. So `decorate(value, validCitations).digest === SourceChainEngine.digest(validCitations)`. **MATCH.**

Now let me scrutinize the edge cases and fail-soft guarantees carefully, especially the subtle ones the contract calls out.

Let me verify the `decorate` non-throw guarantee and the `score=0` / Zod-`.parse`-order subtleties by examining the TS `decorate` against the MJS path once more, and check one concern about digest divergence on invalid-but-present inputs.

I have everything needed. Here is my assessment.

---

## Review: `H:/prism/scripts/lib/source-chain-lib.mjs`

Reviewed end-to-end against `H:/prism/mcp-server/src/engines/SourceChainEngine.ts` (both files fully read). Focus: byte-parity of `digest`/`renderMarkdown`/`decorate` for valid citations
... [+4135 chars truncated]
