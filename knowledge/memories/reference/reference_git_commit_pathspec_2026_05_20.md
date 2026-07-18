---
name: git-commit-pathspec-absorption-2026-05-20
description: "On the shared H:/prism tree, `git add <files>` alone does NOT scope a commit — a bare `git commit` takes the WHOLE shared index. Both commit directions got peer-absorbed in one mike session."
aliases: reference_git_commit_pathspec_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.587Z
---


# `git add <pathspec>` is NOT enough on the shared tree — `git commit` needs `-- <pathspec>` too

**Observed 2026-05-20, slot mike, session 641d292f.** Two peer-absorptions in one session:
1. mike's queue close-out (`slot-task-queues.json`) was swept INTO lima's commit `03bdaad407` — work landed in HEAD under lima's message.
2. mike's `U-BUG-FINDING-WIKI-FOLLOWUPS` commit `041e131920` ABSORBED 4 alpha HyperMill files that alpha had staged — 7 files in a 3-file commit.

**Root cause:** I ran `git add <my-3-files> && git commit -m ...`. The `git add` was pathspec-scoped, but `git commit` with NO pathspec commits **everything currently staged in the shared `.git/index`** — including whatever peer slots staged in the same window. On a 16-chat shared tree the index is a shared mutable surface.

**The fix — pathspec the COMMIT, not just the add:**
```
git commit -- <file1> <file2> ...      # commits ONLY these paths, ignores other staged files
# or
git commit <file1> <file2> -m "..."     # same effect
```
A pathspec `git commit` does a partial commit — it ignores the rest of the shared index. This is the *only* way to guarantee attribution on the shared tree short of a slot worktree.

**Refines** [[reference_git_index_saturation_camx11]] (which said "use pathspec commit" — correct, but easy to satisfy with pathspec *add* only and miss). The class is the same as [[reference_iter2_html_adopt_misattribution]] and [[reference_h8_misattribution]].

**Forward fix:** slot-worktree migration (`/checkin-<slot>` Step 2c) gives each chat its own index — no shared-index race at all. Until then: always `git commit -- <files>`.
