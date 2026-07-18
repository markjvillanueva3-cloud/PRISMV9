---
name: reference_shared_tree_torn_commit_2026_06_09
description: Shared-tree git add then a concurrent peer commit can unstage your files → torn commit that doesn't build. Verify git show --stat immediately after every commit.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.188Z
aliases: reference_shared_tree_torn_commit_2026_06_09
---


# Shared-tree torn-commit (slot:echo, 2026-06-09)

On the shared `H:/prism` tree with the fast 26-slot fleet committing concurrently, a
`git add <4 files>` → (edit one file) → `git add <that file>` → `git commit` sequence
produced a TORN commit (`f3ca55e928`): only the last-added file (cimcoDispatcher.ts) was
captured; the 3 earlier-staged files (engine/schema/test) were silently UNSTAGED in the
window between staging and commit (concurrent peer `git`/hook activity on the shared index).
The dispatcher then referenced engine fields/method the committed engine type didn't define
→ the commit does not build in isolation (R15-step1 / R12). Caught ONLY because the 3-of-3
scrutiny reviewed the actual COMMIT (`git show f3ca55e928`), not the working tree.

**Why:** the shared index is contended; another slot's `git add`/commit/reset between your
stage and your commit can drop your staged entries. `[MAIN]` shared-tree commits are exposed
to this.

**How to apply:**
1. Stage + commit + `git show --stat HEAD` in ONE atomic bash call; assert ALL expected
   files appear (`git show --stat HEAD | grep -c <pattern>` == N). Fail loud if short.
2. If torn and HEAD has moved (peer committed after), you CANNOT amend → follow-up commit
   that lands the dropped files; the unit then spans 2 commits (note it honestly).
3. Scrutiny reviews the COMMIT, never the working tree — a green working-tree vitest does
   NOT prove the commit builds. [[feedback_commit_to_slot_worktree]] (slot worktrees avoid
   this entirely) · [[feedback_commit_prefix_main_on_shared_tree]].
