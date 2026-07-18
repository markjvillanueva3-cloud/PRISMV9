---
name: reference_shared_tree_commit_contamination_2026_06_08
description: "On the shared H:/prism tree under heavy multi-slot load, git add/commit absorbs peer-staged files — stage+commit atomically, verify the committed file list, never amend a peer-stacked commit"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 919ef97f-3673-4dbf-b351-7543ccb4d448
---

**Observed by slot:romeo 2026-06-08 (CATALOG-APP-WIRING-MS0) — three distinct absorption events in one session.**

On the shared `H:/prism` working tree with ~5 active slots committing concurrently, peer background processes (hooks, regen scripts, auto-feeds) continuously write files into the **shared git index**. Consequences observed:

1. `git add <my 3 files>` then `git commit` (separate calls) → the commit absorbed 3 enum-only actions a peer (oscar) had left uncommitted in `calcDispatcher.ts` (gwizard_compare/sfc_tri_compare/sfc_baseline_compare — 0 handlers, 404 on call). Caught by scrutiny Arm A.
2. `git commit --amend` (after staging only 3 files) → absorbed a different peer's `scripts/obsidian-memory-sync.*` (U-VAULT-SYNC-RESILIENT) AND dropped my own workflow file. The amend committed the whole index, not just my stage.
3. Atomic `git add ... && git commit ...` → still absorbed a regenerated artifact (`.wiki-tribal-cross-ref-audit.json`, 6428 lines) staged by a golf process in the sub-second gap.

**Why:** also a peer (juliett, sierra) stacked commits on top of mine BETWEEN my operations, so `--amend` orphaned my fix commit (`521d5f63b4` became unreachable; juliett's `a9a50f46d5` was built on the pre-fix `aca389cc97`).

**How to apply:**
- **Stage + commit in ONE atomic chained command** (`git add X Y Z && git commit -F -`) to minimize the concurrent-index window. Still not bulletproof.
- **Verify the committed file list** immediately after: `git show HEAD --stat`. If it absorbed peer files, that's a finding to surface (R12), not hide.
- **NEVER `git commit --amend`** on the shared tree once a peer may have stacked on your commit — it orphans your work and absorbs the live index. Use a **forward-only follow-up commit** instead (the conflict-fork rule).
- **Best fix (use next time):** commit from the **slot worktree** `H:/prism-slot-romeo` (per [[feedback_commit_to_slot_worktree]]) — per-slot index, zero cross-slot contention. The shared-tree `[MAIN]` workflow is contention-prone under fleet load.

Code-state artifacts (generated JSON dashboards) absorbed are low-risk (regenerable); peer SOURCE absorbed is the real hazard. Related: [[reference_catalog_corpus_loader_2026_06_08]] · [[feedback_commit_to_slot_worktree]] · [[feedback_commit_prefix_main_on_shared_tree]].
