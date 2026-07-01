---
name: reference_lima_academy_audits
description: Two academy audits gate a course as done — audit-academy-prereq-chain (6 problem classes) + audit-course-dispatcher-citations (citation coverage %). Run both before reporting done.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.643Z
aliases: reference_lima_academy_audits
---


Slot:lima ships two advisory, idempotent academy audits (PRISM-ACADEMY-FEATURES-MS0). Run BOTH before reporting any course done:

1. **`scripts/audit-academy-prereq-chain.mjs`** — detects 6 prereq-graph problem classes: circular dependency, missing prereq, orphan course (no inbound), dead-end (no descendants), level-jump (foundations→advanced with no bridge), disconnected island. First run found 4 islands + 2 level-jumps; 4 surgical prereq edits fixed → 2 islands / 0 level-jumps. Powers the `CourseDetail.tsx` prereq-lineage + next-steps UI.

2. **`scripts/audit-course-dispatcher-citations.mjs`** — cross-references every course's `prismDispatcherActions[]` array against the real dispatcher source. Baseline 70.2% coverage (153/218 implemented; 65 aspirational actions surfaced for triage). Catches courses that cite a dispatcher action that doesn't exist (R12 — uncited/wrong-cited claim).

**How to apply:** `rtk node scripts/audit-academy-prereq-chain.mjs && rtk node scripts/audit-course-dispatcher-citations.mjs`. Both advisory (never auto-edit). Surface the aspirational-citation gap honestly, don't hide it. Both in slot/lima worktree only ([[reference_lima_branch_drift_academy]]). See [[reference_lima_citation_at_claim]], [[reference_lima_scaffold_force_multiplier]].
