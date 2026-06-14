---
name: reference_shared_tree_silent_deletion_2026_06_09
description: "INTEGRITY FINDING (2026-06-09, slot:alpha): the leave-a-copy-behind Stop guard fired TWICE in one session on git-tracked files silently deleted from the H:/prism shared working tree (uncommitted ` D` deletions) — 28 files total: MIGRATION-FREEZE-ACTIVE.flag, 20 reference_cad_fusion_live_engine_*_2026_06_09.md vault memos, 3 engine *.test.ts, 5 CLAUDE-MD-PATCH-*.md. NONE deleted by this chat. All git-tracked (recoverable) → restored from HEAD (non-destructive; not allowlist/bypass — can't assert peer intent). Root cause UNKNOWN (peer sweep or a cleanup process on the 5-peer shared tree); flag for golf/fleet-hygiene. The freeze-flag deletion re-enabled the scheduled-task cry-wolf WARN, confirming it was accidental."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.935Z
aliases: reference_shared_tree_silent_deletion_2026_06_09
---


# Recurring silent deletion of git-tracked files on the shared tree (2026-06-09, slot:alpha)

The `leave-a-copy-behind-guard.mjs` Stop hook BLOCKED twice in one session on
git-tracked files that vanished from the `H:/prism` shared working tree as
uncommitted ` D` (deleted-not-staged) entries. None were deleted by this chat
(alpha/token-optimization). The guard did exactly its job — caught the silent
loss before a Stop committed/forked it (the U-WIRE12 incident class).

## What was lost + recovered (28 files, all restored from HEAD)
1. `state/shared/MIGRATION-FREEZE-ACTIVE.flag` — the HW-migration freeze marker.
   Its deletion RE-ENABLED the scheduled-task "safety net WARN" cry-wolf (the
   exact noise the flag suppresses), confirming the deletion was accidental, not
   an operator lifting the freeze. ([[fleet-task-health-ms0]])
2. 20 × `knowledge/memories/reference/reference_cad_fusion_live_engine_*_2026_06_09.md`
   — cad-fusion-live galaxy auto-memos (a PEER's domain). Git-tracked, but ABSENT
   from the C: canonical source dir → the Stop feed could NOT regenerate them →
   genuine loss had the deletion stood.
3. 3 × `mcp-server/src/__tests__/{BidWinCalibrator,InternalAuditCalendar,ManagementReview}Engine.test.ts`
   — business-domain engine tests.
4. 5 × `state/shared/dashboards/patches/CLAUDE-MD-PATCH-*.md` — token/efficiency
   patch artifacts.

## The decision (consistent, conservative)
RESTORE from HEAD for all 28 — never allowlist (can't assert a peer's deletion was
intentional) and never BYPASS (silent loss in a safety-critical repo). Restoring a
committed file is NON-destructive: it returns the file to last-committed state; a
peer with a genuine intentional deletion re-applies it deliberately + adds the
allowlist entry the rule documents. Partial-restore-then-bypass would have been
silent loss; reverting peer work without restoring would have stomped them — restore
threads both.

## OPEN — root cause (NOT chased; out of alpha's lane, flag for golf/fleet-hygiene)
SOMETHING on the 5-peer shared tree deletes git-tracked files (vault memos + tests +
patches) without committing the deletion. Candidates: a peer chat's working-tree
sweep, a cleanup/janitor process, or a dedup pass that `rm`s tracked files. This is a
real integrity threat — a vault that silently sheds tracked memos is NOT "fully wired"
(goal clause-4). Next: golf/fleet-hygiene should trace which process/peer emits these
deletions and either commit them properly or stop them. Pairs with
[[feedback_commit_to_slot_worktree]] (shared-tree contention is the root hazard).

## LESSON
The leave-a-copy guard is load-bearing, not bureaucracy: it caught 28 silent losses
in one session, ≥20 of which (the cad-fusion memos) were UNRECOVERABLE from C: source.
When it fires on files you didn't delete: investigate (git-tracked? in C: source?
intentional?), then RESTORE git-tracked files (non-destructive) rather than
allowlist/bypass unless you OWN the deletion and can assert intent.
