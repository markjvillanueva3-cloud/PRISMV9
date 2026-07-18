---
title: "Never git stash in a shared multi-chat tree"
name: never-git-stash-in-a-shared-multi-chat-tree
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_no_git_stash_shared_tree.md
promoted_at: 2026-06-06T04:55:48.647Z
source_refs: 18
---

# Never git stash in a shared multi-chat tree

NEVER run `git stash` (or `git stash pop`) in the `H:/prism` shared working tree — ~6 concurrent Claude chats keep uncommitted WIP there. `git stash` sweeps up EVERY chat's changes; `git stash pop` then races peers' edits and conflicts, "keeping" the stash and leaving some files reverted to HEAD (= peer WIP silently dropped from the WT into the stash). Hit exactly this 2026-05-11 testing a hook — botched `git stash`/`pop` clobbered `scripts/regen-viz.mjs` + `state/shared/specs/SYSTEM-VIZ-HIGH-VALUE-FEATURES-2026-05-11.md`; recovered via `git show stash@{0}:<path> > <path>` but it left a redundant `stash@{0}` on the stack.

**Why:** the shared tree is multi-writer; `git stash` is a single-writer operation that assumes the WT is yours alone.

**How to apply:**
- Need a clean tree to test something? Don't. Test against a temp copy (`mkdtemp` + copy the file), or test the code directly without touching the WT, or work in your own worktree.
- Need an old version of one file? `git show <ref>:<path> > <path>` (read-only, no `index.lock`, no global stash).
- Found a `stash@{N}` you didn't create? Leave it — it's a peer's. Only `git stash drop` one you created AND confirmed is a perfect duplicate of the current WT (`git stash show <ref> --name-only` == `git diff --name-only`, and per-file `git diff <ref> -- <f>` == 0).
- If you must stash-and-restore in `H:/prism`: don't. Just don't.

## Source

Promoted from memory [[feedback_no_git_stash_shared_tree]] (referenced 18x across the vault). The memory remains the editable source of truth.
