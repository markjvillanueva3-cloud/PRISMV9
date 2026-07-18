---
name: reference_command_kernel_ms0_register_collision
description: "2026-05-14 COMMAND-KERNEL-MS0 registration shipped across 2 commits (collision) — envelope+inject-script+atomic-roadmap absorbed into peer commit 7e01cd12b; my commit 3366a9c74 carries the rest. Files correct on disk, 3-of-3 PASS at session claude-0fe601c1."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.238Z
aliases: reference_command_kernel_ms0_register_collision
---


**Event:** 2026-05-14, slot inferred from session `claude-0fe601c1`. Registered `COMMAND-KERNEL-MS0` onto the BACKEND-DEVTOOLS-RGS6 master roadmap as the 29-unit synthesis-layer capstone (psk syscall layer + composition primitive + Obsidian-as-OS + closed feedback loop).

**Split across 2 commits due to multi-chat staging collision** (matches the pattern in [[reference_coord_ms0_u4_collision]] / [[reference_intel_ollama_p22_u03_collision]] / [[reference_blueprint_ocr_training_ms1_collision]]):

| Commit | Title | My files in it |
|--------|-------|----------------|
| `7e01cd12b` | `[SLOT-WORKTREE-MS0]/U-PHASE0: per-slot worktree architecture + migration tooling` | **Absorbed** my `COMMAND-KERNEL-MS0.json` (29-unit envelope) + `inject-tribal-pipeline-into-atomic-roadmap.mjs` (generalized) + `atomic-roadmap.json` (+29 units, +29 alpha-lane) |
| `3366a9c74` | `[MAIN] [COMMAND-KERNEL-MS0]/U-CK-REGISTER: envelope + roadmap merge` | `roadmap-index.json` (+1 MilestoneEntry, 745→746) + `BUILD_STATE.{json,md}` (regen) + `MILESTONE_PROGRESS.{json,md}` (regen) |

**Cause:** during the registration work, the shared `.git/index` had peer chat files also staged (fleet-reaper, viz-output-size, etc.). When the peer chat ran `git commit` without explicit pathspec, MY staged envelope + inject script + atomic-roadmap got swept into the peer's `[SLOT-WORKTREE-MS0]/U-PHASE0` commit. By the time my explicit-pathspec commit ran, only 5 files were left to commit.

**Files are correct + tracked — do NOT re-create thinking they're missing.** The commit *messages* understate scope; the on-disk state is canonical.

**Verification commands (run before assuming anything's missing):**
```bash
git log --all --diff-filter=AM -1 -- mcp-server/data/milestones/COMMAND-KERNEL-MS0.json
git log --all --diff-filter=AM -1 -- scripts/inject-tribal-pipeline-into-atomic-roadmap.mjs
git log --all --diff-filter=AM -1 -- state/shared/atomic-roadmap.json
# All three resolve to 7e01cd12b — confirmed.
```

**Scrutiny:** session `claude-0fe601c1` cleared **3-of-3 PASS** (Arm A holistic + Arm B independent + Arm C code-analyzer regression-risk). All 3 reviewers verified file content + cross-commit ownership. The scrutiny ledger entry IS load-bearing; the commit-message split is cosmetic.

**Companion artifact (not in either commit — gitignored by design):**
- `H:/prism/.claude/commands/pick-dev.md` — devtools-locked thin wrapper around `pick-unit.mjs`. Local-only per `.gitignore:61` (.claude/commands/). Works as a skill (verified appearance in the available-skills system reminder).

**Deliverable C deferred per design** (review-gated per user directive): the 173-milestone drift sweep via `/envelope-drift-fix --fix` is operator-driven, separate pass. Disk investigation of `AUTO-LEARNING-LOOP-MS0` (plan Part 4 Step 3) completed in this session: all 6 reverse-drift engines + all 12 U-ALL units exist on disk → leave envelope as `complete`.

**Worktree remnant:** `H:/prism-command-kernel-ms0` was created as emergency fork during peer-contention then never used (the contention resolved before commit). Currently LOCKED (`lock reason: initializing` — checkout was killed mid-populate). Force-remove:
```bash
git -C H:/prism worktree remove --force --force ../prism-command-kernel-ms0
# OR: manually unlock then remove:
git -C H:/prism worktree unlock ../prism-command-kernel-ms0
git -C H:/prism worktree remove ../prism-command-kernel-ms0
```

**Companion to:** [[feedback_conflict_fork_rule]] · [[feedback_no_git_stash_shared_tree]] · [[reference_coord_ms0_u4_collision]] · [[reference_training_learning_ms0_u1_collision]] · [[reference_blueprint_ocr_training_ms1_collision]] — all the same multi-chat absorption pattern. Lesson: in a hot shared tree, ALWAYS use `git commit -- <pathspec>` AND verify the resulting commit's file list before celebrating.

**Follow-up tasks for future chats:**
1. Operator: run `/envelope-drift-fix --fix` for the 173 drift cases (Deliverable C).
2. Operator: unlock + remove `H:/prism-command-kernel-ms0` worktree.
3. Future COMMAND-KERNEL-MS0 unit builders: read this entry FIRST. The envelope + injection are already live — start at U-CK01 (psk CLI skeleton).


## Related
[[skills/index|/index]] • [[skills/data|/data]] • [[skills/milestones|/milestones]] • [[skills/inject-tribal-pipeline-into-atomic-roadmap|/inject-tribal-pipeline-into-atomic-roadmap]] • [[skills/shared|/shared]] • [[skills/atomic-roadmap|/atomic-roadmap]] • [[skills/prism|/prism]] • [[skills/commands|/commands]] • [[skills/pick-dev|/pick-dev]] • [[skills/envelope-drift-fix|/envelope-drift-fix]]