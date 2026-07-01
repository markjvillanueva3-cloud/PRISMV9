---
name: reference_selfaware_fossil_reconcile_2026_06_23
description: "How a bulk-absorbed orphan test-fossil testing a DEAD prototype API is reconciled (port real coverage for any still-live method it names + DELETE the fossil -- never realign N dead-API assertions). Plus a re-observation of the shared-tree commit-absorption hazard. Unit U-SELFAWARE-FOSSIL-RECONCILE, commit 2864dddba6, slot:india 2026-06-23."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.151Z
aliases: reference_selfaware_fossil_reconcile_2026_06_23
---


# Fossil-test reconcile pattern (port-real-coverage + delete, never realign-the-dead)

## The pattern (R7 + R9 + R13)
When a test file is N-failing against a DEAD engine API (methods renamed/removed, sync->async drift,
string->object drift) AND a maintained sibling test file already covers the CURRENT API:
1. **Read git history of BOTH files.** A single-commit bulk-absorb (e.g. `799be785cb [CLEANUP-MS0]/U-TEST-FOSSIL:
   absorb 1,651 orphan untracked tests`) vs an actively-maintained file is the smoking gun for "orphan fossil".
2. **Enumerate the engine's REAL public API** (grep method defs / LSP) -- do not trust the fossil's method names.
3. **For every method the fossil names, classify:** (a) REAL + covered by the maintained file, (b) REAL but
   UNCOVERED (has live consumers -> port real-value tests), or (c) DEAD (grep proves ZERO callers on the
   singleton across src/ -> safe to drop).
4. **Port real coverage for class (b)** into the maintained file with branch-exact real-value assertions (R9),
   then **DELETE the fossil**. NEVER "realign" class-(c) assertions -- that fabricates tests for nonexistent
   methods (anti-R9). Deletion of a 114-failing dead-API orphan loses no valid coverage.

## This instance (PRISMSelfAwarenessEngine)
- Fossil `src/__tests__/engines/PRISMSelfAwarenessEngine.test.ts` = 114 failing; ~21 dead methods (analyzeGap
  singular, quickProactiveCheck, generateWebSearch, getDriveLocations, getJMDieMachineFolders, trackUsage,
  getUsageStats, clearCaches, getCacheStats, getTrustedSources, isSourceTrusted, ...) -- grep-confirmed ZERO
  callers on `prismSelfAwarenessEngine`.
- 4 REAL uncovered methods (proactiveReason/whatCanIDo/howDoI/whoHandles) have live consumers
  (DeepAIIntelligenceEngine, LatheSelfAwarenessIntegrationEngine, MachiningIntelligenceOrchestratorEngine,
  AutonomousSessionIntegrationEngine) -> ported 19 real-value tests into the maintained file (31 -> 50, 50/50 green).
- Deleted the fossil. 2-of-2 end scrutiny PASS (both arms verified assertions vs engine).
- Supersedes the "realign 114 tests" plan in [[reference_prismselfawareness_test_fossil_2026_06_23]] (now RESOLVED).

## Re-observed: shared-tree commit-absorption hazard
Working in the shared `H:/prism` tree (not the slot worktree), a `git rm` + the first test-Edit got ABSORBED
into a concurrent PEER commit (`89245bbfb8`, slot:quebec) before my own commit landed -- only the later P2
additions carried my `[MAIN-FORCE] ... (slot:india)` attribution (`2864dddba6`). Work was intact + correct, but
attribution split. This is exactly [[feedback_commit_to_slot_worktree]] -- prefer the slot worktree; in the
shared tree, commit by-pathspec IMMEDIATELY after staging, and re-stage deletions if a restore/mirror hook
brings an untracked copy back (an untracked test file still gets picked up by `vitest run` -- must `rm` the disk copy).
