---
name: feedback_each_slot_can_merge_2026_05_31
description: DOCTRINE CHANGE 2026-05-31 — golf is no longer the sole merge slot; EVERY chat slot can now land its own work to main. Supersedes the golf-routes-all-merges assumption.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.423Z
aliases: feedback_each_slot_can_merge_2026_05_31
---


**Operator directive, 2026-05-31:** "golf no longer is the sole chat slot for merges, each chat slot now can do it."

**Why:** previously merges-to-main / full-tree sync were routed to golf (the [[feedback_golf_owns_reaper|fleet-hygiene]] slot). That bottleneck is removed — every slot now self-merges its own shipped work to main instead of handing off to golf.

**How to apply:**
- A slot that has shipped + scrutiny-passed work no longer reports "blocked on golf merge" — it lands the work itself.
- **BUT** removing the permission gate does NOT remove the MECHANICAL gate: a `slot/<name>` worktree may have **UNRELATED git history** with main (history-strip → no merge-base). Verify topology first: `git merge-base main HEAD` (empty = unrelated). If unrelated, `git merge` will NOT work — land via **cherry-pick** of the session commits onto a main-based worktree (`git worktree add ../merge-tree main` → `git cherry-pick <range>`), resolving conflicts on shared dispatcher/schema files by re-applying the additive edits. NEVER `git merge --allow-unrelated-histories` (conflict storm).
- Verify the merge BUILDS CLEAN ON MAIN (main has 0 tsc errors; a slot worktree's pre-existing tsc errors are staleness, not real) + the new tests pass, BEFORE pushing the shared trunk.
- Still post a chat-bus note + close out the 5 roadmap surfaces ([[feedback_roadmap_close_out]]) after a self-merge so the fleet sees it.

**Supersedes:** the "full sync routed to golf" assumption in earlier session handoffs/memories. Golf keeps the [[reference_fleet_reaper|fleet-reaper]] / hygiene role ([[feedback_golf_owns_reaper]]); it just no longer monopolizes merges.

First applied: india's 6-feature merge (2026-05-31) was PLANNED under this (see [[reference_each_slot_can_merge_2026_05_31]] + `state/shared/specs/INDIA-MERGE-PLAN-MS0.md`) but EXECUTION deferred to a fresh-budget session (the cherry-pick onto unrelated-history main is a careful shared-trunk op that shouldn't be rushed at 70% context).
