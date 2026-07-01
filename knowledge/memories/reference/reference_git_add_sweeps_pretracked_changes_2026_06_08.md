---
name: reference_git_add_sweeps_pretracked_changes_2026_06_08
description: "git add <file> commits ALL uncommitted hunks in that file, not just yours — on the shared tree a file already marked M sweeps a peer's in-progress wire into your commit (mis-attribution). Stage hunks, not whole pre-modified files."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.587Z
aliases: reference_git_add_sweeps_pretracked_changes_2026_06_08
---


# git add <file> sweeps pre-tracked changes (romeo, 2026-06-08)

## What happened
Shipping `U-GWIZARD-TOOLCRIB-EXPORT` (3 files), I ran `git add mcp-server/src/tools/dispatchers/calcDispatcher.ts`. That file was ALREADY `M` (modified, uncommitted) at session start — a peer/prior session had staged a `surface_finish_compare` / `SFCCompareEngine` wire in the working tree. `git add <file>` stages the ENTIRE current file content, so my commit `20181a4c78` carried BOTH my `gwizard_export_toolcrib` wire AND the foreign `surface_finish_compare` wire. Scrutiny reviewer A caught it ("stray inclusion, not named in the subject").

## Why it's only P2 here (but could have been worse)
The swept-in wire was a CLEAN, functional existing-engine wire — `SFCCompareEngine.compare()` is a real `static compare(input)` at `SFCCompareEngine.ts:73`, called type-safely. So nothing broke; the only cost was muddied attribution (my G-Wizard commit silently also shipped SFCCompare). Had the pre-existing hunks been a half-finished/broken edit, I'd have committed a broken action under my banner.

## The rule (lane discipline)
On the shared `H:/prism` tree, before `git add <file>`, check `git status --short <file>`:
- If it's `??` (untracked, all yours) → `git add <file>` is safe.
- If it's ` M` (already modified before you touched it) → you DON'T know which hunks are yours. Stage hunks, not the file:
  - `git add -p <file>` and accept only your hunks, OR
  - diff first (`git diff <file>`) to confirm every hunk is yours.
- Slot worktrees (`H:/prism-slot-<nato>`) mostly avoid this — the shared tree is where pre-modified files collect peer churn.

## Verify-after rule
After any shared-tree commit touching a big peer-shared file (calcDispatcher.ts, settings.json, index.ts), run `git show --stat <sha>` + grep the diff for anything NOT in your stated scope. Surface it in the handoff rather than letting it ride silently (R7).

[[feedback_commit_to_slot_worktree]] · [[feedback_commit_prefix_main_on_shared_tree]] · [[feedback_conflict_fork_rule]]
