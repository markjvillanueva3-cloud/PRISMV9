---
type: "chat-session"
source: "claude-code-cli"
session_id: "3b735015-a3e0-4ba4-8b97-35384113b9f9"
title: "Round-2 verification of a PRISM Claude Code hook after fixes. Read both files EN"
date: "2026-05-18"
first_ts: "2026-05-18T02:43:35.556Z"
last_ts: "2026-05-18T02:44:33.046Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/3b735015-a3e0-4ba4-8b97-35384113b9f9/subagents/agent-a92e215da0211d718.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Round-2 verification of a PRISM Claude Code hook after fixes. Read both files EN

> **claude-code-cli** | 2026-05-18 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3b735015-a3e0-4ba4-8b97-35384113b9f9/subagents/agent-a92e215da0211d718.jsonl`

## Transcript

### User | 2026-05-18T02:43:35.556Z

Round-2 verification of a PRISM Claude Code hook after fixes. Read both files END TO END:
FILE 1: H:\PRISM\.claude\hooks\mcp-readonly-cache.mjs
FILE 2: H:\PRISM\.claude\hooks\mcp-readonly-cache.test.mjs

Round 1 raised these — VERIFY each fix is correct and complete, and flag any NEW defect introduced:

1. `MUTATING_VERB` was a thin allowlist over an open dispatcher action set (fragility — a future mutating action ending in a read suffix could be wrongly cached).
   → Now: expanded to ~95 verbs; a docstring note that the classifier is conservative-by-design AND that a misclassification only DELAYS (never drops) a re-issued mutating call because `deny` is soft + the count-based escape passes the retry. Verify the reasoning holds: trace what happens if a mutating action WERE misclassified read-only and called twice — confirm the mutation is not silently dropped.

2. `stableStringify` collapsed `{x:undefined}` and `{x:null}` to the same key (wrong-deny vector).
   → Now: `if (v === undefined) return UNDEF_SENTINEL` + `?? UNDEF_SENTINEL` fallback. Verify `{x:undefined}` and `{x:null}` now produce different keys, and that this didn't break the order-stability property.

3. Docstring claimed "13+ concurrent fleet chats never race on RMW" — false for parallel tool calls within one session.
   → Now: docstring honestly states cross-session race-free, same-session parallel calls may lose an update, harmless. Verify the docstring is now accurate and the claimed harmlessness is correct (a lost call record = missed dedup; a lost deny mark = self-heals).

4. The "mutating action never denied" oracle didn't fail-on-revert (`memory_save` is suffix-rejected anyway, so deleting the MUTATING_VERB gate left it green).
   → Now: a unit test `isReadOnlyAction("x_record_status") === false` paired with `"x_status" === true`. Verify this genuinely fails if the MUTATING_VERB gate is removed.

Also confirm new additions are sound: `normalizeParams` (absent/null/empty-object → same key), the 
... [+351 chars truncated]

### Assistant | 2026-05-18T02:43:43.760Z

I'll read both files end to end and verify each Round 1 fix.

### Assistant | 2026-05-18T02:43:44.194Z

[tool_use: Read]

### Assistant | 2026-05-18T02:43:44.409Z

[tool_use: Read]

### User | 2026-05-18T02:43:45.234Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * mcp-readonly-cache.mjs — duplicate read-only MCP dispatcher-call guard.
5	 *
6	 * HIGH-ROI-HOOKS-MS0 / U-HRH02. The MCP-tier sibling of bash-result-cache:
7	 * PRISM backend dev makes hundreds of `mcp__prism…` dispatcher calls per
8	 * session and frequently re-issues an IDENTICAL read-only one (re-checking
9	 * `gap_scan_read`, `db_health`, `master_i
... [+11555 chars truncated]

### User | 2026-05-18T02:43:45.453Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * mcp-readonly-cache.test.mjs — HIGH-ROI-HOOKS-MS0 / U-HRH02.
5	 *
6	 * Pure-function coverage + subprocess integration oracles. Several oracles
7	 * are fail-on-revert guards: the "mutating action is never denied" oracle
8	 * would FAIL if the safety filter were reverted.
9	 *
10	 * Run: node --test H:/prism/.claude/hooks/mcp-readonly-cache.test.mjs
11
... [+11550 chars truncated]

### Assistant | 2026-05-18T02:44:33.046Z

I've read both files end to end. Verifying each Round 1 fix and the new additions.

## Round 1 Fix Verification

### Fix 1 — MUTATING_VERB expanded + misclassification reasoning

**Verified — fix is correct.** `MUTATING_VERB` (lines 65-66) is now ~95 verbs. Docstring (lines 18-30, 62-64) states the conservative-by-design rationale.

**Tracing the misclassification scenario** — suppose a mutating action (e.g. hypothetically `widget_frobnicate_status`) slipped past `MUTATING_VERB` and was classified read-only, called twice with identical params:
- Call 1: `decideMcpCheck` returns `pass`/`no-entry` (line 105) → `data.calls[key]` recorded (line 273) → `emitPass()`. **Mutation executes.**
- Call 2: `decideMcpCheck` finds a fresh entry, no deny mark → returns `deny` (line 108) → `data.denies[key]` set (line 253) → `emitDeny`. **This call is blocked.** But `deny` is soft (`permissionDecision: "deny"`, not exit 2) — the model sees the reason and re-issues.
- Call 3 (the re-issue): `decideMcpCheck` sees `typeof denyMark === "number"` → returns `pass`/`deny-loop-escape` (line 106) → deny mark deleted, call re-recorded (lines 245-249) → `emitPass()`. **Mutation executes.**

The mutation is **delayed by one hook round-trip, never dropped.** Reasoning holds. The only loss is one extra model turn — acceptable for a misclassification that is itself unlikely given the 95-verb gate.

### Fix 2 — `stableStringify` undefined/null distinction

**Verified — fix is correct.** Line 79 `UNDEF_SENTINEL = " undef"`; line 83 returns it for bare `undefined`; line 84 `JSON.stringify(v) ?? UNDEF_SENTINEL` catches a value position that stringifies to `undefined`.

- `{x:undefined}` → key `"x"` maps to `stableStringify(undefined)` = `" undef"` → `{"x": undef}`.
- `{x:null}` → `stableStringify(null)` = `"null"` → `{"x":null}`.

Different strings → different keys. Test at lines 115-121 confirms via both `stableStringify` and `cacheKey`. The sentinel `" undef"` (leading space) cannot be produced by `
... [+6320 chars truncated]
