---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f91ed3-89e5-466c-a184-b901ccebc56d"
title: "Review the modified UserPromptSubmit hook file `H:/prism/.claude/hooks/audit-viz"
date: "2026-05-19"
first_ts: "2026-05-19T15:01:02.719Z"
last_ts: "2026-05-19T15:02:22.092Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/d7f91ed3-89e5-466c-a184-b901ccebc56d/subagents/agent-ab455132dabc2de8c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Review the modified UserPromptSubmit hook file `H:/prism/.claude/hooks/audit-viz

> **claude-code-cli** | 2026-05-19 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d7f91ed3-89e5-466c-a184-b901ccebc56d/subagents/agent-ab455132dabc2de8c.jsonl`

## Transcript

### User | 2026-05-19T15:01:02.719Z

Review the modified UserPromptSubmit hook file `H:/prism/.claude/hooks/audit-viz-first-inject.mjs` end-to-end against this contract:

**Context (read first):** This is SLOT-COMPACT-SYNERGY-MS0 Wave 3 of the SESSIONSTART-HOOK-AUDIT-2026-05-19 spec (`H:/prism/state/shared/specs/SESSIONSTART-HOOK-AUDIT-2026-05-19.md`). The audit measured this hook's per-prompt cost at ~1112 bytes × ~150 prompts ≈ 165KB/session and prescribed a "more aggressive intent classification" to halve the fire rate.

**What I changed (compared to git HEAD~1):**
1. Split `AUDIT_KEYWORDS` into `STRONG_AUDIT_KEYWORDS` (Set, 9 entries) + `WEAK_AUDIT_KEYWORDS` (Set, 8 entries). The combined `AUDIT_KEYWORDS` array preserves the original longest-prefix-wins detection order.
2. `extractNoun` now returns `{noun, source}` where source ∈ {"quoted","camel","kebab","fallback",null}.
3. New pure exported `shouldFire(matched, nounResult, strictFilter=true)` predicate: STRONG kw fires on any source; WEAK kw fires only when source !== "fallback"; unknown bucket = legacy fire; null/short noun = no fire.
4. Added `PRISM_AUDIT_VIZ_FIRST_STRICT_FILTER` env knob (default "1" = new filter, "0" = legacy behavior).
5. `main()` is now gated behind `pathToFileURL(resolve(argv[1])).href` so the file is both a CLI hook AND an ESM-importable module.
6. Added `STRONG_AUDIT_KEYWORDS`, `WEAK_AUDIT_KEYWORDS`, `MIN_NOUN_LEN` named exports.

**Specifically check for P0/P1 issues:**
- Is the longest-prefix-wins ordering of AUDIT_KEYWORDS preserved? (multi-word phrases must match before single-word) — was: "are there any", "gap analysis", "find all", "where is", "check for", "how many", "list all", "what exists", then single-word.
- Does the STRONG/WEAK partition cover every entry in AUDIT_KEYWORDS exactly once?
- Could the main-detect (`isMain = import.meta.url === pathToFileURL(resolve(argv[1] || "")).href`) ever silently skip main() when invoked via spawnSync (the harness convention)?  Argv[1] should be the script path on a norma
... [+631 chars truncated]

### Assistant | 2026-05-19T15:01:35.060Z

I'll review the modified hook file end-to-end against the contract.

### Assistant | 2026-05-19T15:01:36.053Z

[tool_use: Read]

### User | 2026-05-19T15:01:48.711Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// audit-viz-first-inject.mjs — UserPromptSubmit T2 hook.
4	// When an audit/discovery intent is detected, auto-run
5	// `node scripts/system-viz-query.mjs find <noun>` and inject the top-K hits
6	// so the chat sees the answer BEFORE reaching for Grep/Glob.
7	//
8	// Knobs: PRISM_AUDIT_VIZ_FIRST_DISABLE=1 · PRISM_AUDIT_VIZ_FIRST_K=N (1..20, def 5)
9	//       
... [+8519 chars truncated]

### Assistant | 2026-05-19T15:02:22.092Z

Acknowledged the doctrine and hooks-rules reminders. Note that these conventions describe bash hook scripts (`common.sh`, `parse_hook_input`, `deny/hint/warn`); this hook is a Node ESM hook following the Claude Code Node-hook convention (stdin JSON → stdout JSON `hookSpecificOutput`), which is the existing repo standard for `.claude/hooks/*.mjs`. Exit-code semantics from the bash rules don't apply — the harness reads `process.stdout` JSON. No new manual workflow is taught.

Proceeding with the requested end-to-end review.

---

## VERDICT: FAIL (1 P0, 2 P1, 1 P2)

### P0 — `WEAK_AUDIT_KEYWORDS` ⊄ `AUDIT_KEYWORDS` ("are there any" never reaches `shouldFire`)

**File/line:** `audit-viz-first-inject.mjs:63-68` (combined `AUDIT_KEYWORDS`) vs `:56-59` (WEAK set).

The contract states: *"the STRONG/WEAK partition cover every entry in AUDIT_KEYWORDS exactly once."* Cross-check:

- `WEAK_AUDIT_KEYWORDS` (8): `are there any, find all, where is, check for, how many, list all, what exists, missing`
- `STRONG_AUDIT_KEYWORDS` (9): `audit, inventory, orphan, duplicate, unwired, survey, reconcile, enumerate, gap analysis`
- `AUDIT_KEYWORDS` (17): all the above **minus `"are there any"`**.

Line 63 begins `"are there any", "gap analysis", "find all"...` — wait, re-reading: `AUDIT_KEYWORDS` line 63 DOES contain `"are there any"`. Let me recount: line 63: `"are there any", "gap analysis", "find all", "where is", "check for",` line 64: `"how many", "list all", "what exists",` line 66-67: `"audit", "inventory", "orphan", "duplicate", "unwired", "missing", "survey", "reconcile", "enumerate"`. Total = 5+3+9 = **17**. STRONG(9)+WEAK(8)=17. Partition correct. **P0 retracted.**

### P1 — `STOPWORDS` swallows every WEAK fallback noun anyway, but ALSO swallows STRONG nouns

**File/line:** `:70-76`.

`STOPWORDS` contains every STRONG keyword (`audit, inventory, orphan, duplicate, unwired, survey, reconcile, enumerate`) AND `missing`. Effect: a prompt like *"audit orphan engines"* extracts noun
... [+2235 chars truncated]
