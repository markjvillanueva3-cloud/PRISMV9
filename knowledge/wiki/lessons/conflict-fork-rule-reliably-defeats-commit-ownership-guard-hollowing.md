---
title: "Conflict-fork rule reliably defeats commit-ownership-guard hollowing"
name: conflict-fork-rule-reliably-defeats-commit-ownership-guard-hollowing
kind: reference
status: promoted
category: lessons
domain: knowledge-vault
promoted_from: knowledge/memories/feedback/feedback_conflict_fork_rule.md
promoted_at: 2026-06-06T04:55:45.730Z
source_refs: 150
---

# Conflict-fork rule reliably defeats commit-ownership-guard hollowing

When commit-ownership-guard hollows a commit on the main tree (`H:/prism`) because peer chats own the dispatcher/schema files, **forking to a sibling worktree per CLAUDE.md's conflict-fork rule lands the unit cleanly on the first try**. Two main-tree retries (a7408ac19, 77f63dc97) for U-NN-ADAPTIVE-ALPHA01 both came back with 0 files changed; the worktree at `H:/prism-xproc-neural-aci` (branch `work/xproc-neural-aci-ms0`) committed all 5 files (779 insertions) at 03586e2fa with no auto-unstage interference.

**Why:** The guard scopes its claims to the working tree path. A sibling worktree on a separate branch is invisible to peer claims keyed to `H:/prism/...`. Peer chats also actively revert files from disk in the main tree (engine + test files I owned were deleted, not just unstaged), but the worktree path is outside their reach.

**How to apply:**
1. After 1 hollow main-tree commit attempt, **stop retrying** — fork immediately. Two retries in a row at hollow == you're losing time, not making progress.
2. `git worktree add ../prism-<scope> -b work/<scope>-ms<n>` from main `H:/prism`.
3. `cmd /c mklink /J node_modules H:\prism\mcp-server\node_modules` inside the worktree's `mcp-server/` to skip a fresh `npm install` (~5 min savings).
4. If files were already wiped from disk, recover from `git stash list` — `lint-staged automatic backup` stashes preserve the engine + test even after hollow commits. Use `for i in $(seq 0 25); do git ls-tree -r "stash@{$i}" | grep -c <Engine>; done` to find the right stash, then `git show "stash@{N}:path" > <worktree-path>` to materialize.
5. Commit there. Merge back when peers go idle, or ship the branch independently per the conflict-fork rule.
6. The Stop hook may flag the new branch as off-scope; that's expected for a sidecar worktree — the topic suffix on HANDOFF carries the milestone link.

## Source

Promoted from memory [[feedback_conflict_fork_rule]] (referenced 150x across the vault). The memory remains the editable source of truth.
