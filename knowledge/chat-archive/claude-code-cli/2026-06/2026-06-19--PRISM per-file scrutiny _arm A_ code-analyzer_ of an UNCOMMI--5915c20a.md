---
type: "chat-session"
source: "claude-code-cli"
session_id: "5915c20a-a517-4e95-bc12-edf7d9055431"
title: "PRISM per-file scrutiny (arm A, code-analyzer) of an UNCOMMITTED change to a Pre"
date: "2026-06-19"
first_ts: "2026-06-19T17:15:36.676Z"
last_ts: "2026-06-19T17:16:28.821Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/5915c20a-a517-4e95-bc12-edf7d9055431/subagents/agent-ac3fdbfc93198f5fe.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# PRISM per-file scrutiny (arm A, code-analyzer) of an UNCOMMITTED change to a Pre

> **claude-code-cli** | 2026-06-19 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5915c20a-a517-4e95-bc12-edf7d9055431/subagents/agent-ac3fdbfc93198f5fe.jsonl`

## Transcript

### User | 2026-06-19T17:15:36.676Z

PRISM per-file scrutiny (arm A, code-analyzer) of an UNCOMMITTED change to a PreToolUse hook. You are the independent regression/silent-breakage reviewer. Read BOTH files end-to-end:

1. H:/prism/.claude/hooks/pre-grep-graph-inject.mjs
2. H:/prism/.claude/hooks/pre-grep-graph-inject.test.mjs

WHAT THE CHANGE DOES (GAP-A, unit U-INLINE-CARD-PREGREP): the pre-grep graph-inject hook previously injected only NODE NAMES for multi-hit BM25 results; the model then had to make a follow-up node-card/Read call. This change adds an inline node-CARD for the single TOP non-exact hit when its BM25 score >= a threshold (param `inlineCardMinScore` > env `PRISM_PRE_GREP_INLINE_CARD_MIN_SCORE` > default 10). New pure exported `renderTopCardBlock(hit, seekDocs)` renders `[card] [layer/status] label (score: N.N)` + info + vault doc pointers (via the fail-soft `vaultPathsLine` from scripts/lib/graph-exact-match.mjs). The card is prepended to the names block ONLY if `combined.length <= MAX_INJECT_BYTES` (1500); otherwise names-only. Fail-open: any renderTopCardBlock error -> inlineCard=null -> names-only. The diff also converted this hook's EXISTING output strings from unicode (• — → ⚡ 🔗) to ASCII (* -- -> plain) — this was forced by PRISM's ascii-guard which blocks non-ASCII in edited code lines; the existing test assertions at ~line 27 and ~line 35 were updated to match the ASCII output.

VERIFY, citing file:line:
- P0/P1: Does the GAP-A branch ever throw, block the tool, or change the {continue:true} fail-open contract of a PreToolUse hook? Is the 1500-byte cap genuinely respected on EVERY return path (card-fits, card-overflow->names, names-overflow->slice+ellipsis)? Could `topScore >= threshold` fire on the exact-match-collapse path (it must NOT — exact match returns early)?
- Is the threshold resolution correct for: explicit param (incl 0 and negative = disable), env set, env unset/NaN (-> default 10)? Confirm `<= 0` disables.
- TEST INTEGRITY (critical): were the two EXISTING asser
... [+640 chars truncated]

### Assistant | 2026-06-19T17:15:39.893Z

I'll read both files end-to-end to analyze the change statically.

### Assistant | 2026-06-19T17:15:40.993Z

[tool_use: Read]

### Assistant | 2026-06-19T17:15:41.034Z

[tool_use: Read]

### User | 2026-06-19T17:15:42.145Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-grep-graph-inject.mjs — PreToolUse:Grep graph-context injector.
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A2.
7	 *
8	 * Sibling of pre-read-graph-inject.mjs. Before a Grep runs, surface the
9	 * master-index nodes that already match the grep pattern -- "the graph
10	 * already knows these N nodes for your pattern" -- so Claude can often
11	 * an
... [+14473 chars truncated]

### User | 2026-06-19T17:15:43.256Z

[tool_result] 1	import { test } from "node:test";
2	import assert from "node:assert/strict";
3	import path from "node:path";
4	import { fileURLToPath } from "node:url";
5	import { spawnSync } from "node:child_process";
6	import { renderInject, renderTopCardBlock } from "./pre-grep-graph-inject.mjs";
7	
8	const __dirname = path.dirname(fileURLToPath(import.meta.url));
9	const HOOK = path.join(__dirname, "pre-gre
... [+12948 chars truncated]

### Assistant | 2026-06-19T17:15:47.793Z

Both files are fully read. Now let me verify the dependency `vaultPathsLine` to confirm the fail-soft contract the change relies on, and check the byte-cap math edge case.

### Assistant | 2026-06-19T17:15:47.893Z

[tool_use: Read]

### User | 2026-06-19T17:15:48.783Z

[tool_result] 1	// graph-exact-match.mjs — shared exact-match predicate + node→path render line
2	// for the PreToolUse graph-context-inject hooks (pre-bash / pre-grep / pre-write).
3	// SYSTEM-VIZ / U-SV-NAV-INJECT-GREP-WRITE (sierra).
4	//
5	// WHY shared: pre-bash first grew the "exact-match collapse" (when the derived
6	// keys match exactly ONE concrete graph node, emit a short banner + a
7	// `→ Read <rep
... [+4771 chars truncated]

### Assistant | 2026-06-19T17:16:28.821Z

I now have full visibility into the change and its key dependency. Let me trace the byte-cap edge case precisely and confirm one subtle interaction in the `vaultPathsLine` contract.

Key observation: `vaultPathsLine` (graph-exact-match.mjs:66) emits a NON-ASCII line (`\n  • 📂 vault paths — ...`) when `seekDocs` returns docs. The hook's diff converted its OWN strings to ASCII, but it reuses this shared helper which still emits unicode. Let me verify whether that creates a regression concern for the GAP-A card path versus the existing exact-match path that already uses it.

The exact-match banner (line 91) ALREADY emits `\n  • ${layer}...` unicode bullets and `vaultPathsLine` unicode — and that path is pre-existing and unchanged. So the unicode in `vaultPathsLine` is consistent with prior behavior; the ascii-guard only blocks non-ASCII on *edited* lines, and `renderTopCardBlock` references `docLine` via a function call (no literal unicode in the edited hook file). This is correct and not a regression. Let me trace the byte-cap math one more time on the overflow path.

Looking at renderInject:155-160:
- Card fits: `combined.length <= 1500` returns combined (≤1500). OK.
- Card overflows: falls through to line 160 — `namesBlock.length <= 1500 ? namesBlock : slice(0,1500)+"…"`. The names block alone could be up to 1500, then `+"…"` makes it 1501 bytes (3-byte char). Test asserts `<= 1501`. OK — matches existing pre-change behavior.

One subtle point: `combined.length` is JS string `.length` (UTF-16 code units), NOT byte length. `MAX_INJECT_BYTES` is named "bytes" but compared against `.length`. This is a pre-existing naming imprecision (the existing truncation at line 160 has the same), not introduced by GAP-A. The `📂` emoji in `docLine` is a surrogate pair (`.length===2`), so `.length` slightly under-counts true UTF-8 bytes — but this is the same imprecision as the pre-existing exact-match path and is conservative-enough for an advisory cap. Not a new finding.

Let me ve
... [+5099 chars truncated]
