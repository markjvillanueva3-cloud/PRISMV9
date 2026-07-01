---
name: feedback_no_rm_shared_lock_with_staged_index
description: "On the shared H:/prism tree, removing an index.lock — even an old one — can absorb a peer's pre-staged files into YOUR commit. Age ≠ safe. Prefer committing from your own slot worktree."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.436Z
aliases: feedback_no_rm_shared_lock_with_staged_index
---


**Rule:** Do NOT `rm .git/index.lock` on the shared `H:/prism` tree just because it looks stale (old mtime). A lock can be 200s+ old AND still be guarding a peer chat's **staged index** (files `git add`-ed but not yet committed). Removing it lets your next `git add` + `git commit` sweep the peer's staged files into YOUR commit.

**Why:** A `git commit` commits the entire INDEX, not just the paths you added. If a peer left files staged (their commit interrupted / slow / mid-edit), your commit absorbs them under your message + U-ID.

**How it bit echo (2026-05-29):** removed a 228s-old lock → commit `36c4232824` (echo post-gen deps, 2 files) silently absorbed 4 pre-staged blueprint-vision files (`xray-blueprint-domain-inject.{mjs,test.mjs}`, `blueprint-vision-knowledge-index.md`, `blueprint-vision/CLAUDE.md`). Work was intact + atomic (not lost), but mis-attributed. Recovered via an AGENT_CHAT.md coordination note to the peer.

**How to apply:**
1. Before removing a shared-tree lock, check `git status --porcelain` / `git diff --cached --name-only` — if the **index has staged files you didn't stage**, do NOT remove the lock; wait or fork.
2. Better: commit from your own slot worktree (`H:/prism-slot-<nato>`) — its index is yours alone. See [[feedback_commit_to_slot_worktree]] + [[feedback_conflict_fork_rule]].
3. If you must clear a lock on shared HEAD, `git stash`-free check first; after committing, verify `git show --stat HEAD` shows ONLY your files — if not, post a peer-absorption notice to AGENT_CHAT (R12).
4. The fleet has `git-lock-sweeper.mjs` (golf/reaper) which sweeps zero-byte/dead-PID locks safely — prefer it over manual `rm`.

**Refinement (2026-05-30, repeat occurrence — same hazard bit echo again, commit `4d8a8d2c5f` swept 174 peer files):**
- **mtime-frozen ≠ empty index.** My staleness gate only checked the lock's mtime was frozen (75s+). That correctly identifies a *crashed* git process, but a crashed `git add` STILL leaves its files staged in `.git/index`. Frozen-lock + non-empty staged index = the trap. **After clearing any shared lock, ALWAYS `git diff --cached --name-only` and treat a non-empty result as peer content.**
- **PREVENTIVE — `git commit -o` (`--only`):** `git commit -o <path1> <path2> -m "..."` commits ONLY the named paths regardless of what else sits in the index — a plain `git add <paths>` + `git commit` does NOT (it commits the whole index). Use `-o` whenever the index might hold peer content.
- **RECOVERY if you already swept (commit is local/unpushed):** guard on HEAD being yours, then `git reset --mixed HEAD^` (undoes the commit, KEEPS the working tree, unstages everything → peer files return to unstaged, preserved) → `git add <your files>` → recommit. Verify the new `git show --stat HEAD` count matches your file count. The peer's work is never lost (working tree intact throughout); it just returns to their control.
