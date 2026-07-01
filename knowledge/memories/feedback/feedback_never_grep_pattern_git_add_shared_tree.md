---
name: feedback_never_grep_pattern_git_add_shared_tree
description: "On the shared H:/prism tree (26 concurrent chats), NEVER `git add` files selected by a `git status | grep <pattern>` pattern -- a broad pattern sweeps PEER/concurrent untracked files into your commit. Always name the exact files you authored. Self-caught + reverted live 2026-06-15 (slot:alpha)."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.436Z
aliases: feedback_never_grep_pattern_git_add_shared_tree
---


On the shared `H:/prism` working tree (up to 26 concurrent chats), **never `git add` a set of files
chosen by `git status --short | grep <pattern>`** -- a pattern broad enough to catch your auto-gen doc
reflections will also catch UNRELATED peer/concurrent untracked files, and you commit work you never
authored or reviewed (lane-discipline + R8 violation).

**Why:** the tree always has peer/hook-generated untracked files in flight. A grep like
`(code-index|grep-index|name-resolver)` intended to catch my `grep-index-first-*.md` reflections also
matched `scripts/regen-code-index.mjs` (x2) + `grep-index-first-nim-migrate.test.mjs` + a 966-line
`EXECUTION_CHAIN.json` -- none mine. I committed all 9, then had to `git reset HEAD~1` to undo it.

**How to apply:**
- `git add path/a path/b path/c` -- explicitly name ONLY the files you wrote this session. Never a glob/grep.
- Auto-generated wiki/claude-md doc reflections are NOT yours to commit -- leave them untracked; the
  doc-reflection / golf process owns them. Your unit commit needs only your real code + its own spec/doc.
- If you must undo a bad commit on the shared tree: `git reset HEAD~1` (mixed) un-commits + unstages,
  leaving files on disk untracked; verify HEAD moved back to YOUR prior commit (a peer could have
  committed in between -- check `git log -1` first).

Sibling of the chain-add+commit lesson (peer running git-add-all absorbs your shared-tree commit) and
[[feedback_conflict_fork_rule]]. The clean fix for both is the slot-worktree model (`H:/prism-slot-<nato>`),
where there are no peer untracked files to sweep.
