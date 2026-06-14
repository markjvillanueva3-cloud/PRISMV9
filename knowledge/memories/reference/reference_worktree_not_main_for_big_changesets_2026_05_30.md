---
name: reference_worktree_not_main_for_big_changesets_2026_05_30
description: Hard-won proof — committing big changesets to the shared main tree fails under fleet contention (40+ lost lock windows + peer-absorption + broken HEAD); the bravo worktree committed the same work first-try with zero contention. Always use the worktree.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.063Z
aliases: reference_worktree_not_main_for_big_changesets_2026_05_30
---


2026-05-30 (slot:bravo, ZULU-RENAME-MS0): operator twice asked "didn't we build a system where each chat commits to its own NATO worktree?" — and they were right. I bypassed it and paid for it all session.

**What went wrong (committing the zebra->zulu migration to the SHARED main tree H:/prism instead of the bravo worktree):**
1. **Relentless `index.lock` contention** — 40+ commit windows lost; peers (echo/xray/golf/india) commit to `cad-fusion-live-ms0` every few seconds, so `git add`/`commit` almost never gets the lock.
2. **Peer-absorption (H8 class)** — my staged engine renames got swept into a *peer's* commit (`bb4eae6aec`), and only PARTIALLY, leaving HEAD broken (Zulu engine files + Zebra dispatcher imports). Had to repair HEAD separately.
3. **`git mv` silently degraded to `fs.rename`** because the lock was held during the migration run — renames became untracked-new + deleted-old instead of git-aware renames.
4. **351k-untracked swamp** made `git status` hang and precise staging nearly impossible.

**The proof:** the SAME `.gitignore` swamp-fix committed to the **bravo worktree** (`git -C H:/prism-slot-bravo commit`) succeeded **on the first attempt** (`6bcb65b177` on `slot/bravo`) — zero contention. Linked worktrees have their OWN `.git/worktrees/<name>/index.lock`, so they never contend with the peers hammering main's `.git/index.lock`. THAT is why the slot-worktree model exists.

**Rules reaffirmed:**
- **Any non-trivial changeset → commit in the slot worktree** (`H:/prism-slot-<nato>` on `slot/<nato>`), let golf merge to main. The `[MAIN]` override is for tiny operator-authorized live hotfixes ONLY, never a 100+-file migration.
- The golf-only-integrator rule was removed ([[feedback_all_slots_free_access]]) — any slot CAN do git work — but that means *in its own worktree*, not on shared main.
- **Root cause of the contention = the 351k untracked swamp**: regenerable caches (`state/shared/cad-cam-pdf-nodes/` [biggest], `youtube-extraction`, `cag-route`, `loop-state`, `.cron-locks`, `slot-sessions`) were never gitignored. Fixed: added them to `.gitignore` (non-destructive — tracked files unaffected; verified cad-cam-pdf-nodes now ignored). The remaining untracked is the knowledge base (`knowledge/wiki/architecture` 12.8k, memories) which is *behind on commits* — a track-not-ignore decision, separate.

**ZULU-RENAME-MS0 state at this memory:** migration applied on disk + reproducible from committed `scripts/migrate-zebra-to-zulu.mjs`; engine code + dispatcher committed to main (HEAD builds); 173 at-risk content edits captured in `state/shared/.zulu-atrisk.txt` pending a main window; gitignore swamp-fix on `slot/bravo` (`6bcb65b177`) for golf to merge. Related: [[reference_slot_drift_worktree_transcript_2026_05_30]], [[feedback_commit_to_slot_worktree]].
