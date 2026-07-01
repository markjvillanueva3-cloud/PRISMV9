---
title: Test-fossil reconcile -- port real coverage, then delete (never realign the dead)
type: lesson
created: 2026-06-23
slot: india
tags: [testing, fossil, reconcile, R7, R9, vitest, orphan-tests, shared-tree-absorption]
links:
  - "[[reference_selfaware_fossil_reconcile_2026_06_23]]"
  - "[[reference_prismselfawareness_test_fossil_2026_06_23]]"
  - "[[feedback_commit_to_slot_worktree]]"
---

# Test-fossil reconcile: port real coverage, then delete

## Problem
A test file is N-failing against a **dead engine API** (methods renamed/removed, sync->async drift,
string->object return drift). The naive "fix" is to realign all N assertions -- but if the methods no
longer exist, that **fabricates tests for nonexistent code** (anti-R9). Many such files are bulk-absorbed
orphans: PRISM's `799be785cb [CLEANUP-MS0]/U-TEST-FOSSIL` absorbed **1,651 orphan untracked tests** in one
commit; any of them may test a dead prototype API while a maintained sibling already covers the live one.

## The reconcile pattern (R7 conflict resolution + R9 + R13)
1. **Read git history of BOTH the suspect file and any sibling test for the same engine.** A single bulk-absorb
   commit vs an actively-maintained file is the smoking gun for "orphan fossil, not the source of truth".
2. **Enumerate the engine's REAL public API** (grep method defs / LSP documentSymbol) -- do NOT trust the
   fossil's method names; they may be a speculative prototype surface that never shipped.
3. **Classify every method the fossil names:**
   - (a) REAL + already covered by the maintained file -> nothing to do.
   - (b) REAL but UNCOVERED (grep finds live consumers) -> **port real-value tests** into the maintained file.
   - (c) DEAD (grep proves ZERO callers on the singleton across `src/`) -> safe to drop.
4. **Port coverage for class (b), then DELETE the fossil.** Never "realign" class-(c) assertions.
   Deleting an N-failing dead-API orphan loses no *valid* coverage -- the dead assertions never passed.

## Verification gates (R12 -- prove, don't assume)
- Grep the distinctive dead method names across `src/` (exclude generic names like `trackUsage`/`searchResources`
  that collide with other engines) -> confirm they appear ONLY in the fossil.
- Grep `<singleton>.<method>` call-sites -> confirm dead methods have zero consumers and real methods have them.
- An **untracked** leftover test file still gets run by `vitest run` -- `rm` the disk copy, not just `git rm`.

## Worked instance
`PRISMSelfAwarenessEngine`: fossil `src/__tests__/engines/PRISMSelfAwarenessEngine.test.ts` (114 failing,
~21 dead methods, 0 consumers) -> deleted; 4 real uncovered sync methods
(`proactiveReason`/`whatCanIDo`/`howDoI`/`whoHandles`, consumed by DeepAIIntelligenceEngine +
LatheSelfAwarenessIntegrationEngine + MachiningIntelligenceOrchestratorEngine + AutonomousSessionIntegrationEngine)
got 19 ported real-value branch-exact tests in the maintained `src/__tests__/PRISMSelfAwarenessEngine.test.ts`
(31 -> 50, 50/50 green). Commit `2864dddba6`, 2-of-2 scrutiny PASS.

## Companion hazard: shared-tree commit absorption
Working in the shared `H:/prism` tree, a `git rm` + the first test-edit were **absorbed into a concurrent peer
commit** before the owning chat's own commit landed -- only the later additions carried the right
`(slot:india)` attribution. Work stayed intact; attribution split. Prefer the slot worktree; in the shared
tree, commit by-pathspec immediately after staging. See [[feedback_commit_to_slot_worktree]].
