---
name: reference-git-index-saturation-camx11-2026-05-18
description: 2026-05-18 kilo — shared H:/prism git index saturated fleet-wide; U-CAMX11 took ~45 commit attempts and ultimately shipped via peer-absorption into f5403a8274
aliases: reference_git_index_saturation_camx11_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.588Z
---


2026-05-18, slot kilo (claude-c0eb54b9), CAMX-MS0.3 /loop. Shipped U-CAMX09 (`9e243ff100`) + U-CAMX10 (`b12b41c01a`) cleanly, then **U-CAMX11 commit took ~45 attempts** before landing.

**What happened:** the shared `H:/prism/.git/index.lock` was held >98% of the time — 16 peer chats committing concurrently + a heavy PRISM commit-hook stack serialized on the one index. Found **two peer `git commit` processes wedged in commit-hooks** (PID 65388 @ 3 min, PID 34964 @ 7 min — a 1-file `git reset` should take <1 s). Killed the wedged ones; the lock kept getting re-grabbed instantly. `git worktree add` (the documented conflict-fork escape) itself wedged 8+ min and left a half-checked-out worktree `H:/prism-kilo-camx11` (branch `camx-kilo-u11`, index empty — broken).

**How U-CAMX11 actually shipped:** an early `git add` of the 2 U-CAMX11 files staged them into the shared index; a peer's `git commit -a`/`git commit .` for KNOWLEDGE-ENRICH-MS0 then **swept both files into peer commit `f5403a8274`** (subject `[MAIN] [KNOWLEDGE-ENRICH-MS0]/U-KE01`). Work is correct + at HEAD (`git diff HEAD` empty == byte-identical to the verified working tree; 22 U-CAMX09/10/11 markers in HEAD's engine), only the commit subject is mislabeled. Same cross-chat-misattribution class as [[reference_cross_chat_commit_misattribution_2026_05_18]] and the U-CAMX24 absorption earlier this session.

**Why:** **Why:** working on the shared `H:/prism` main tree instead of a slot worktree means a shared git index — `git add` exposes your staged files to any peer's `git commit -a`. Under 16-chat load the index is also a hard serialization point.

**How to apply:** (1) Do NOT `git add` then poll-retry on the shared tree — staged files get absorbed. Use **pathspec commit** (`git commit <path1> <path2> -m`) which does not depend on prior staging and only commits named paths. (2) If pathspec commit reports "no changes added," check `git log -- <file>` — the work may have already been peer-absorbed (verify at HEAD before re-doing it). (3) The real fix is the slot-worktree model (`H:/prism-slot-kilo` on `slot/kilo`) — a separate worktree has its own index, zero contention. Migrate via `/checkin-kilo` Step 2c. (4) A wedged peer `git commit` (minutes old) holding `index.lock` is legitimate to kill — but expect the lock re-grabbed; killing alone does not free the tree under sustained 16-peer load. (5) Don't burn 40+ tool calls fighting it — detect saturation early, migrate to the worktree or checkpoint. Related: [[feedback_conflict_fork_rule]].
