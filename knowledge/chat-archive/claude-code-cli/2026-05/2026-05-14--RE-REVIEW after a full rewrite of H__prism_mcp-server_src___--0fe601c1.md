---
type: "chat-session"
source: "claude-code-cli"
session_id: "0fe601c1-0fbe-4ef2-b6d5-64d54264beb1"
title: "RE-REVIEW after a full rewrite of H:\\prism\\mcp-server\\src\\__tests__\\VizRegenGuar"
date: "2026-05-14"
first_ts: "2026-05-14T14:59:15.154Z"
last_ts: "2026-05-14T14:59:45.880Z"
cwd: "H:\\prism\\mcp-server"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-ab7ff9fedcf69dccd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# RE-REVIEW after a full rewrite of H:\prism\mcp-server\src\__tests__\VizRegenGuar

> **claude-code-cli** | 2026-05-14 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-ab7ff9fedcf69dccd.jsonl`

## Transcript

### User | 2026-05-14T14:59:15.154Z

RE-REVIEW after a full rewrite of H:\prism\mcp-server\src\__tests__\VizRegenGuard.test.ts (U-CLEANUP-F5). You previously returned VERDICT: PASS with one P1 (miss-log rotation — not applicable here, that was a different unit).

CONTEXT: The SUT `viz-regen-guard.mjs` was substantially rewritten to fix a P0 (the hash gate now keys on the graph's CONTENT signature, not source trees), so the test suite was rewritten to match the new helper surface. It is now 50 tests across 9 describe blocks (A-I), all passing.

New/changed test coverage:
- A: `graphContentSignature` — stable across genAt-only rewrite (different lengths), moves on headline-count change, missing, whole-head fallback, `"nodes":[` anchor not confused by a `meta.headline.nodes` count field
- D: `computeManifestHash` — F5 CORE test: hash does NOT change on a generatedAt-only graph rewrite; does change on real headline-count change / generator-script change; non-gate entries excluded
- E: `checkStaleInputs` — wall-clock staleness, injectable `nowMs` for determinism
- F: `guardedRegen` — refuses/skips/F5-contract/re-runs/--force/--check(would_run + would_skip + would_run_forced)/regen_failed/--dry-run; verifies the regen is spawned WITH --force; verifies atomic persist (no .tmp leftover)
- G: `renderHuman` — EVERY action branch (refused×2, skipped, regen_ran, regen_failed, the 3 would_* actions, unknown→default)
- H: CLI subprocess smoke test — spawns the REAL script with `--check` (read-only: no spawn, no persist), asserts exit 0|3, JSON shape, `.exit` matches process exit code, and `--check --human` emits non-JSON

Re-read the file end-to-end. Confirm:
1. Every test is a real-value assertion that would fail against a broken implementation — no theater.
2. The F5 core contract (genAt-only rewrite does NOT trigger regen) is tested at BOTH the `graphContentSignature` level AND the `guardedRegen` end-to-end level.
3. The injectable `spawn` stub and the CLI subprocess test together give adequate confidence — the s
... [+324 chars truncated]

### Assistant | 2026-05-14T14:59:18.896Z

I'll read the rewritten test file end-to-end to verify the coverage claims.

### Assistant | 2026-05-14T14:59:18.988Z

[tool_use: Read]

### User | 2026-05-14T14:59:23.863Z

[tool_result] 1	/**
2	 * VizRegenGuard.test.ts — U-CLEANUP-F5.
3	 *
4	 * Tests scripts/viz-regen-guard.mjs — the centralized, dependency-aware gate in
5	 * front of regen-wiki-from-viz.mjs. Two behaviors under test:
6	 *   1. hash gate keyed on the graph's CONTENT (the generatedAt-stripped meta
7	 *      header) + the wiki generator scripts — NOT the raw churning graph.json
8	 *   2. staleness REFUSAL when syst
... [+25533 chars truncated]

### Assistant | 2026-05-14T14:59:45.880Z

Excellent. I've read the file end-to-end. Let me verify each claim systematically.

## Verification Results

### 1. Real-Value Assertions (No Theater)
✅ **CONFIRMED** — Every test checks concrete behavior:
- **Block A** (lines 70–109): `graphContentSignature()` assertions on actual hash values, "missing" return, content movement on real changes.
- **Block D** (lines 192–218): F5 core tested at TWO levels: (1) `graphContentSignature` stable across `generatedAt` rewrite, (2) `computeManifestHash` does NOT change on cosmetic timestamp (line 192–196 is the direct assertion).
- **Block F** (lines 315–323): The F5 CONTRACT is tested end-to-end — `guardedRegen` preserves `skipped` status after a `generatedAt`-only graph rewrite.
- **Block H** (lines 431–444): CLI subprocess test spawns the REAL script with `--check`, asserts exit codes and JSON shape.

No `expect().toBeTruthy()`, no empty test bodies, no theater.

### 2. F5 Core Contract (genAt-only rewrite does NOT trigger regen)
✅ **DOUBLE-COVERED**:
1. **Unit level (Block A, line 70–78):** `graphContentSignature()` is STABLE when `generatedAt` changes from `"2026-05-14T00:00:00Z"` (length 20) to a much-longer string (line 73–74). This is the primitivo that makes the contract work.
2. **Integration level (Block F, line 315–323):** After a `guardedRegen()` run, the file is rewritten with only `generatedAt` changed (`"a-brand-new-cosmetic-timestamp-string"`), and the second invocation correctly reports `skipped` — no spawn, no regen.

The chain is: `graphContentSignature()` stable → `manifestEntrySignature()` uses it → `computeManifestHash()` produces the same hash → `guardedRegen()` skips.

### 3. Stub + Real Subprocess Confidence
✅ **ADEQUATE**:
- **Stub (Block F):** The `spawnStub` (lines 60–64) records spawn calls and their args, allows configurable exit codes. This tests the gate logic (staleness check, hash comparison, --force bypass, --dry-run, atomic persist). Every branch is covered:
  - Refused on stale (line 283
... [+3743 chars truncated]
