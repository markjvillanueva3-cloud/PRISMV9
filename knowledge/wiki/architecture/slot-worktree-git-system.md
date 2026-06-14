---
title: Slot-worktree git system — per-chat staging, commit, and worktree hygiene
date: 2026-06-06
agent: claude-4f0088b1
slot: golf
milestone: SLOT-WORKTREE-MS0
tags: [git, worktree, slots, staging, commit, fleet, hygiene, infrastructure]
boost_keywords: [slot worktree, slot-worktrees.json, slot-branch-bindings.json, slot-worktree-bootstrap, per-chat commit, worktree cleanup, agent isolation worktree, "slot/<name>", BOOTSTRAP-SLOT-ENFORCE, commit-tree update-ref]
links:
  - "[[reference_slot_worktree_activation_2026_05_16]]"
  - "[[reference_slot_worktree_ms0_p3_cutover_complete]]"
  - "[[reference_per_slot_claim_ms0_2026_05_16]]"
  - "[[feedback_commit_to_slot_worktree]]"
  - "[[feedback_conflict_fork_rule]]"
  - "[[reference_shared_tree_git_contention_plumbing_merge_2026_06_06]]"
---

# Slot-worktree git system

How the 26-chat NATO fleet stages and commits without clobbering each other: every work slot lives in its **own git worktree on its own branch**, so two chats can build concurrently and stay independently mergeable. This page is the single doctrine reference for the staging/commit/cleanup machinery.

## The model

| Concept | Value |
|---|---|
| Work slots | 26 NATO names `alpha..zulu` (`SLOT_NAMES` in `.claude/helpers/chat-slots.mjs` — single source of truth, never hard-code the count) |
| Per-slot worktree | `H:/prism-slot-<name>` on branch `slot/<name>` |
| Shared / integrator tree | `H:/prism` on the active milestone branch (currently `cad-fusion-live-ms0`) |
| node_modules | **junction**, not a copy — each worktree shares the main `node_modules` to save disk |
| Integrator | `golf` merges slot branches back; golf is **exempt** from the routing hooks |

A slot's worktree is created on demand the first time that chat runs `/checkin-<slot>` (the claim path materializes it). All 26 may also be pre-created in one shot with the bootstrap below.

## Canonical tooling

- **Bootstrap / refresh:** `scripts/slot-worktree-bootstrap.mjs`
  - Defaults to every slot in `SLOT_NAMES`. Flags: `--slots a,b,c` · `--base <ref>` (default `origin/cad-fusion-live-ms0`) · `--root <dir>` (default `H:/`) · `--dry-run` · `--json` · `--no-node-modules-junction` · `--no-slot-branch-binding`.
  - Idempotent: a slot whose worktree already exists is reported `skipped`; only missing slots are `created`. Safe to re-run as a registry refresh.
  - Writes both state files below.
- **Worktree registry:** `state/shared/slot-worktrees.json` (`schemaVersion 1`) — per-slot `{worktreePath, branch, base, lastAction, lastActionAt, junctions}`.
- **Branch bindings:** `state/shared/slot-branch-bindings.json` — the map `claimSlot()` actually consults to resolve a slot → its `slot/<name>` branch. Auto-seeds on claim; bootstrap rewrites all 26.

## Commit routing (4 default-ON hooks)

Armed per-chat once `chat-slots.json[slot].branch` starts with `slot/`:

1. `worktree-commit-route` — routes the commit into the slot worktree.
2. `git-add-lane-guard` — keeps `git add` inside the slot's lane.
3. `main-tree-write-block` — blocks Edit/Write to the shared `H:/prism` tree from a slot chat.
4. `slot-commit-worktree-enforce` (keystone) — enforces the commit lands on `slot/<name>`.

`golf` (integrator) is exempt from all four. To deliberately commit to the **shared** tree, prefix the commit subject with the bypass marker **`[BOOTSTRAP-SLOT-ENFORCE]`** — this is how the fleet writes to `cad-fusion-live-ms0` directly (e.g. integrator merges, fleet-wide infra).

## Known gotchas (learned the hard way)

- **The bootstrap MERGES the registry; it does not prune orphan keys.** A misspelled or retired slot key (e.g. the historical `juliet` vs the correct `juliett`) survives a re-run and must be deleted surgically. Fixed 2026-06-06 by removing `slots.juliet` (its `H:/prism-slot-juliet` dir never existed). Always diff the registry key set against `SLOT_NAMES` after a bootstrap.
- **Shared-tree commit contention** — concurrent peers + a 257K-file external corpus made `git merge`/`git status` on `H:/prism` take 300s+ and throw `index.lock` exit-255. Two fixes: (a) gitignore the heavy corpus (`Docustrata/` etc. — never commit it), (b) merge with git **plumbing** (`git commit-tree … -p HEAD -p origin/<branch>` then CAS `git update-ref refs/heads/<branch> <newSha> <oldHEAD>`) which never touches `index.lock` or scans the working tree. See [[reference_shared_tree_git_contention_plumbing_merge_2026_06_06]].
- **Agent-isolation worktrees accumulate.** The Agent tool's `isolation:"worktree"` creates throwaway worktrees under `.claude/worktrees/agent-<hex>` on `worktree-agent-<hex>` branches. They auto-clean only when unchanged; abandoned ones linger. Periodically sweep them:
  ```bash
  for wt in $(git worktree list --porcelain | grep "worktree .*/worktrees/agent-" | awk '{print $2}'); do
    git worktree remove --force "$wt"
  done
  git branch --list 'worktree-agent-*' | xargs -r git branch -D   # disposable branches
  git worktree prune
  ```
  (2026-06-06: swept 19 such worktrees + 21 orphan branches, all stranded at one ancestor commit.) Do **not** bulk-remove `slot/*` or peer `work/*` worktrees — those may hold unmerged peer work (multi-chat safety).

## When a routing hook blocks you mid-commit (conflict-fork rule)

If you're still in the shared `H:/prism` tree and a routing hook blocks your commit because a peer owns the files, do **not** fight for the same tree. Canonical fix: migrate via `/checkin-<slot>` into your slot worktree. One-off fallback: `git worktree add ../prism-<scope> -b work/<scope>`. See [[feedback_conflict_fork_rule]] and [[feedback_commit_to_slot_worktree]].

## Related

- Slot claim + per-unit locks: [[reference_per_slot_claim_ms0_2026_05_16]]
- Activation + cutover history: [[reference_slot_worktree_activation_2026_05_16]] · [[reference_slot_worktree_ms0_p3_cutover_complete]]
- Full architecture doc: `state/shared/SLOT-WORKTREE-ARCHITECTURE.md`
