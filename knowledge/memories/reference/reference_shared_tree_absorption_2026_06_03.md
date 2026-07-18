---
name: reference_shared_tree_absorption_2026_06_03
description: "bravo's U-DORMANT-ENGINE-WIRE 8 files were absorbed into whiskey's commit 3e9b3e8667 under heavy shared-tree lock contention — work delivered, attribution lost"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.187Z
aliases: reference_shared_tree_absorption_2026_06_03
---


2026-06-03 (slot:bravo, claude-00175b01). While committing the PSN-OCTOPUS-FLEET-SYNERGY dormant-engine wires from the **shared `H:/prism` tree** (branch `cad-fusion-live-ms0`, NOT a slot worktree), the 8 staged files were **absorbed into a peer's commit** — `3e9b3e8667` `[WHISKEY-LATHE-ACCURACY-MS0]/U-ROUNDTRIP-ACCURACY-RUNG-B (slot:whiskey)`.

**Verified:** the code IS committed (HEAD carries `chatter_stable_rpm_recommend` ×3, `WORKHOLDING_DB_ACTIONS` ×3, `SpeedFeedChatterStabilityAdapterEngine.ts` tracked). The work is delivered + functional — only the commit *subject* is wrong (credits whiskey, not bravo's `U-DORMANT-ENGINE-WIRE`).

**Root cause chain:** (1) committed from the shared tree, not the slot worktree; (2) system was under process-table exhaustion (`bash: fork: Resource temporarily unavailable`), so commit hook-chains failed to fork → died mid-commit → left stale `index.lock` files repeatedly; (3) `git add` staged bravo's 8 files into the SHARED index; (4) a concurrent whiskey `git commit` swept the dirty shared index (bravo's staged files included) into its own commit before bravo could win the lock. This is the exact [[reference_h8_misattribution_2026_05_20|H8 misattribution]] class that [[feedback_commit_to_slot_worktree]] + the `slot-commit-enforce` hook exist to prevent.

**Lesson (reinforces existing doctrine, no new rule needed):** under multi-chat contention the slot worktree (`H:/prism-slot-bravo` on `slot/bravo`) is not optional — a shared-tree `git add` is a race the moment any peer commits. Even `[BOOTSTRAP-SLOT-ENFORCE]` + immediate-commit loses if a peer's `git commit -a`/dirty-index commit fires in the window between your `add` and your `commit`. Do NOT `git add` on the shared tree when peers are active; stage+commit atomically in the slot worktree, or use `git commit -- <pathspec>` from a CLEAN index.

The fix going forward is the documented `/checkin-bravo §2c` slot-worktree cutover. The dedup/handoff trail (chat-bus post `chat-1780513252036` + handoff) preserves bravo attribution out-of-band. Related: [[feedback_commit_to_slot_worktree]] · [[feedback_commit_prefix_main_on_shared_tree]] · [[reference_git_lock_routing_fix_2026_05_26]].
