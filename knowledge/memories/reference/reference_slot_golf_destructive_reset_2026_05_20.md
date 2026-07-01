---
name: slot-golf-destructive-reset-2026-05-20
description: "2026-05-20 mike — slot:golf executed `git reset --hard 4153c539fb` in the shared `H:/prism` tree, dropping BOTH db3b2f497d (mike's U-CK28-RECOMMIT — the actual U-CK28 SkillTier ship) AND b3c8c8c42c (golf's own DOC-HYGIENE/U-CLAUDE-MD-COMPRESS, 162KB→67KB CLAUDE.md). Both commits exist as dangling objects in the reflog and are recoverable indefinitely."
aliases: reference_slot_golf_destructive_reset_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.207Z
---


**Event:** 2026-05-20 ~13:00 CDT, observed by slot mike (claude-056b67b6) during the U-CK28 close-out tick.

**Cause:** slot:golf in shared `H:/prism` tree ran `git reset --hard 4153c539fb`, rewinding HEAD past TWO legitimate committed-and-pushed commits:
- `db3b2f497d` — `[MAIN] [COMMAND-KERNEL-MS0]/U-CK28-RECOMMIT (slot:mike)` — the actual U-CK28 SkillTierRegistryEngine ship (3 files: engine +181 LOC, test 243 lines, envelope flip)
- `b3c8c8c42c` — `[MAIN] [DOC-HYGIENE]/U-CLAUDE-MD-COMPRESS (slot:golf)` — 162KB→67KB CLAUDE.md compress, 15 MS sections collapsed, 108 regression bullets archived

After the reset, HEAD landed at `4153c539fb` (slot:sierra's U-VIZ-G4-SEEDER-FIX, the pre-existing commit).

**Reflog trail (snapshotted in mike chat):**
```
HEAD@{0}: reset: moving to HEAD       (no-op)
HEAD@{1}: reset: moving to 4153c539fb (destructive — dropped {2} and {3})
HEAD@{2}: commit: b3c8c8c42c U-CLAUDE-MD-COMPRESS (golf, DROPPED)
HEAD@{3}: commit: db3b2f497d U-CK28-RECOMMIT      (mike, DROPPED)
HEAD@{4}: reset: moving to HEAD~1     (also destructive — wiped the peer-absorbed 2389e3365b)
HEAD@{5}: commit: 4153c539fb (sierra)
```

**Why this is a critical regression class:** A peer `git reset --hard` in the shared tree destroys ALL commits between the new HEAD and old HEAD — not just the peer's own work. This is the exact failure mode the slot-worktree architecture exists to prevent (per SLOT-WORKTREE-MS0 + CLAUDE.md Conflict-fork rule). golf is doctrinally the integrator — the LAST slot that should ever destructively rewrite shared-tree HEAD. The earlier `reset: moving to HEAD~1` at HEAD@{4} suggests golf was attempting to drop the peer-absorbed `2389e3365b`, then bracketed too aggressively and walked their own follow-ups off the cliff.

**Recovery path** (next post-/compact tick OR next chat with a fresh git index):
1. Slot mike (or any chat) in a slot-worktree OR after the `.git/index.lock` clears:
   ```bash
   git cherry-pick db3b2f497d
   # then push if needed
   ```
2. If cherry-pick conflicts (peer changes overlap), the 3 file blobs can be extracted directly:
   ```bash
   git show db3b2f497d:mcp-server/src/engines/SkillTierRegistryEngine.ts > <path>
   git show db3b2f497d:mcp-server/src/__tests__/SkillTierRegistryEngine-u-ck28.test.ts > <path>
   git show db3b2f497d:mcp-server/data/milestones/COMMAND-KERNEL-MS0.json > <path>
   git add ... && git commit ...
   ```
3. For golf's lost DOC-HYGIENE/U-[[reference_claude_md_compress_2026_05_20|CLAUDE-MD-COMPRESS]]: `git cherry-pick b3c8c8c42c` — but golf should be the one to redo it, since they may have intended to drop their own commit.

**State at incident time (working tree, slot mike):**
- `mcp-server/src/engines/SkillTierRegistryEngine.ts` — modified (matches db3b2f497d)
- `mcp-server/src/__tests__/SkillTierRegistryEngine-u-ck28.test.ts` — untracked (restored via `git show` after LEAVE-A-COPY-BEHIND hook detected deletion)
- `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json` — modified (U-CK28 envelope flipped, restored via `git show`)
- `.git/index.lock` — held by peer for >1 min (~4MB, mid-transaction, not sweepable)

**Tribal lesson:** `git reset --hard` is the most dangerous primitive in a shared tree. Any slot that needs to drop a commit should use `git revert` (additive) instead. The slot-worktree migration on `/checkin-<slot>` (per CLAUDE.md §2c) prevents this entirely — golf operates in `H:/prism-slot-golf` and resets there don't touch other slots' work.

**Sister memories:** [[feedback_no_git_stash_shared_tree]] (same blast-radius class), [[feedback_conflict_fork_rule]] (when this happens, fork rather than fight), [[iter2 HTML-adopt misattribution]] (peer-absorption — adjacent regression class).

**Action items for next-chat / golf chat:**
1. Recover U-CK28 via cherry-pick (mike or any chat after lock clears)
2. Re-apply CLAUDE.md compress (golf, when ready)
3. Consider hardening: a Stop-hook advisory that fires when a chat's reflog shows `reset: moving to <ref>` and the dropped commits include peer-attributed work
4. Migrate golf to its slot-worktree (`H:/prism-slot-golf`) so future resets stay isolated
