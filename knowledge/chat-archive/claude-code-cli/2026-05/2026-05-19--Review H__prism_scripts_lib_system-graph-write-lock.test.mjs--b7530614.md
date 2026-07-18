---
type: "chat-session"
source: "claude-code-cli"
session_id: "b7530614-3417-4245-bc20-f90161b872c9"
title: "Review H:/prism/scripts/lib/system-graph-write-lock.test.mjs END TO END against "
date: "2026-05-19"
first_ts: "2026-05-19T00:06:54.791Z"
last_ts: "2026-05-19T00:07:32.740Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-a858a5fd4eb2465db.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review H:/prism/scripts/lib/system-graph-write-lock.test.mjs END TO END against 

> **claude-code-cli** | 2026-05-19 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-a858a5fd4eb2465db.jsonl`

## Transcript

### User | 2026-05-19T00:06:54.791Z

Review H:/prism/scripts/lib/system-graph-write-lock.test.mjs END TO END against the implementation H:/prism/scripts/lib/system-graph-write-lock.mjs (read BOTH fully).

This is the F11 cross-lock test (U-VIZ-F11-CROSS-LOCK). 24/24 currently pass via `node --test`.

VERIFY (R9 — tests must verify INTENT, fail when business logic changes; flag P0/P1, grade PASS/FAIL):
1. Does each test assert real behavior, not a tautology? Would each test actually FAIL if the corresponding lib logic regressed (e.g. if decideAcquire stopped reclaiming dead pids, does "acquire reclaims a stale DEAD-holder lock" fail)?
2. The load-bearing safety properties — are they pinned with fail-on-revert oracles?
   - stale dead-pid lock self-heals (acquire reclaims + isGraphWriteLockActive→false)
   - live-other refusal (regen holds → add-node defers)
   - release ONLY by owner pid (non-owner must not unlink peer lock)
   - self-pid idempotent re-entry
   - PID-reuse phantom returns active=true (the documented accepted tradeoff — is it pinned so a silent future change fails the test?)
3. Coverage gaps: any exported fn or branch with NO test? (graphWriteLockPath default+override, decideAcquire, decideActive, acquire/release, isGraphWriteLockActive, installGraphWriteLockReleaseOnExit unsubscribe, withGraphWriteLock run/throw/held-skip). Is the OFF-knob (module-load-scoped) coverage gap honestly acknowledged or silently skipped?
4. Is there a real-fs E2E (not only the in-memory fake)? Hermetic fakes don't prove production wiring — confirm the E2E exercises real fs.readFileSync/writeFileSync/unlinkSync.
5. Fake-fs fidelity: does makeFakeFs mirror real node:fs semantics the lib relies on (ENOENT throw on missing read/unlink)? Any place the fake is MORE permissive than real fs, hiding a real bug?
6. Test isolation: env save/restore for PRISM_SYSTEM_GRAPH_WRITE_PID, no handler leak from installGraphWriteLockReleaseOnExit, no real-pid pokes.

Return explicit P0/P1 (or "none") + final line `VERDICT: PASS` 
... [+19 chars truncated]

### Assistant | 2026-05-19T00:07:00.931Z

I'll review both files end-to-end, starting with the implementation and then the test suite.

### Assistant | 2026-05-19T00:07:01.188Z

[tool_use: Read]

### Assistant | 2026-05-19T00:07:01.242Z

[tool_use: Read]

### User | 2026-05-19T00:07:04.126Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * system-graph-write-lock.test.mjs — pure-core + injected-fs coverage for
5	 * the F11 cross-lock (U-VIZ-F11-CROSS-LOCK).
6	 *
7	 * Sibling convention: scripts/lib/graphsage-*.mjs `.mjs`+`.test.mjs`, node:test.
8	 *
9	 * Covers every decision branch the reviewers asked to pin with fail-on-
10	 * revert oracles: stale-dead reclaim, self-pid idempotent re
... [+12379 chars truncated]

### User | 2026-05-19T00:07:04.132Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * system-graph-write-lock.mjs — shared cross-process write lock for
5	 * `state/shared/system-viz/system-graph.json` (DEV-TOOL-CONFLICT-AUDIT-2026-05-17 / U-VIZ-F11-CROSS-LOCK).
6	 *
7	 * ── Why this exists ──────────────────────────────────────────────────────
8	 * F1 (commit dd735c1871) gave `generate-system-viz.mjs` its own OUT_FILE
9	 * (`architectu
... [+11641 chars truncated]

### Assistant | 2026-05-19T00:07:32.740Z

## Code Review: system-graph-write-lock.test.mjs vs system-graph-write-lock.mjs

### R9 Analysis — Intent Verification & Fail-on-Revert Oracles

**1. Real Behavior vs. Tautology**

Each test asserts concrete behavior that FAILS when the corresponding lib logic regresses:

- **decideAcquire stale-dead reclaim** (line 149-154): changes `deadProbe` to `aliveProbe` → test fails (acquired becomes false). ✓
- **decideActive live-pid blocks** (line 113-115): changes `aliveProbe` to `deadProbe` → test fails (active becomes false). ✓
- **own-pid idempotent** (line 83-85, 156-160): if code deleted the `pid === selfPid` branches, tests fail. ✓
- **release only-if-owner** (line 139-141): if code deleted the ownership check in `releaseGraphWriteLock`, non-owner release succeeds and test fails. ✓
- **whitespace tolerance** (line 99-101): if `String().trim()` is removed, test fails on `"  4320\n"`. ✓

All core assertions are **non-tautological** and would fail on realistic regressions.

---

**2. Load-Bearing Safety Properties — Are They Pinned?**

| Property | Test | Fail-on-Revert Oracle | Status |
|----------|------|----------------------|--------|
| **Stale dead-pid self-heals** | 149-154 | `deadProbe` → `aliveProbe` fails | ✓ PINNED |
| **Live-other refusal** | 87-92, 113-115 | `aliveProbe` → `deadProbe` fails | ✓ PINNED |
| **Release only-by-owner** | 139-141 | Remove `pid === selfPid` check → fails | ✓ PINNED |
| **Own-pid idempotent re-entry** | 83-85, 156-160 | Remove self-pid branch → fails | ✓ PINNED |
| **PID-reuse phantom (accepted tradeoff)** | 180-188 | Change `assert.equal(active, true)` to `false` → explicit PINNED | ✓ PINNED + DOCUMENTED |
| **isGraphWriteLockActive→false when stale** | 174-178 | `deadProbe` → `aliveProbe` → fails | ✓ PINNED |

**All 6 critical properties are pinned with explicit fail-on-revert oracles.** Test at line 186 explicitly names the PID-reuse phantom as a "documented accepted tradeoff so a future 'fix' that silently changes it fails her
... [+6461 chars truncated]
