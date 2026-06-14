---
name: shared-tree-absorption-rate-2026-05-26
description: Empirical absorption rate after slot-bridge hooks were disabled — quebec /goal-loop saw 4 absorption events in 7 commits (~57% rate) on 2026-05-26.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.934Z
aliases: reference_shared_tree_absorption_rate_2026_05_26
---


# Shared-tree commit-absorption empirical rate (2026-05-26, slot quebec)

**Trigger:** post-`feedback_slot_bridge_hooks_disabled` (commit `5828080636`, 2026-05-26 — the three bridge hooks `worktree-commit-route` + `git-add-lane-guard` + `main-tree-write-block` were `*_DISABLE=1` kill-switched per user directive "chats can now commit to their actual working tree when slot worktrees don't exist"), every chat is back in the shared `H:/prism` tree. This memory records what the absorption rate actually looks like under that policy with multiple chats committing concurrently.

## Observation — quebec /goal-loop 2026-05-26

In a 2-hour session shipping 7 commits, 4 of them participated in cross-chat absorption:

| Direction | My commit | Other chat | What absorbed |
|---|---|---|---|
| **mine → peer** | (lost) | `a85619394c` (alpha) | U-F2 doctrine: wiki MD (88 LOC) + HTML (150 LOC) + per-memory file. Alpha's FORGE-AUDIT-TOKEN-CONTEXT commit picked them up via parallel `git add`. |
| **peer → mine** | `e5821f9984` (mine, U-B1) | (unknown peer, prism_memory work) | QdrantMemoryVectorBridgeEngine (382 LOC) + test (527 LOC) + schema (19 LOC) + memoryDispatcher delta (22 LOC). 950 LOC absorbed into my U-B1 commit subject. |
| **peer → mine** | `b210018020` (mine, U-F7) | (unknown peer, system-viz work) | [[reference_extracted_modules_pipeline_2026_05_26]].md (memory edit) + scripts/classify-extracted-modules.mjs (253 LOC NEW) + scripts/merge-augmentations.mjs (34 LOC) + scripts/regen-viz.mjs (2 LOC). 289 LOC absorbed into U-F7 subject. |
| **mine → peer** | (lost) | `32a707ec22` (oscar, U-OSC9-09 HSMAdvisor) | My U-V3-MOTION-TOKENS web/src/lib/motion.ts (110 LOC) absorbed into oscar's SFC-9AXIS commit. |

Other commits (`442f70c928`, `5a7bb1553e`, `5957732cf8`, `9cbfa85edc`) kept clean attribution.

**Rate: 4 of 7 commits saw cross-chat absorption (~57%).** Both directions equally likely.

## Mechanism

In a shared git tree with N concurrent processes running `git add` against the same `H:/prism/.git/index`:

1. Process A calls `git add <my-file>` — index now contains: peer-staged-files-from-before + my-file
2. Process A calls `git commit` — index is committed, my-file plus whatever else peers happened to stage in the window between A's add and commit
3. If A's commit is the next-to-land, A's commit subject claims all of it; if A's commit hits lock-contention and waits, peer commits land first and stage state can flip again on the retry

There's NO mutual exclusion between `git add` calls in the shared index. The bridge hooks `worktree-commit-route` (route commit to slot tree) + `git-add-lane-guard` (block `git add` of files outside slot's lane) + `main-tree-write-block` (block Edit/Write in main tree) prevented this by forcing every chat to operate on its own physical worktree (`H:/prism-slot-<nato>`). With those disabled and no slot worktrees on disk, every chat is back in the shared tree.

## Mitigations (none fully closes the gap)

- **`command git add <exact-paths>`** — only stages the named files, NOT `.` or `-A`. We used this throughout the session. It does not help: peers can stage their files in parallel; the named-path add is a subset of the full index state at commit time.
- **`git commit -i <files>`** — commits only the named files even if other things are staged. Untested in our session; would let us name our intent without absorbing peer state.
- **Slot worktrees on disk** — `git worktree add H:/prism-slot-quebec slot/quebec` then bind via chat-slots; the three bridge hooks re-arm automatically since they only kill-switch when slot dir is missing. This is the canonical fix per `feedback_commit_to_slot_worktree`.
- **Single-chat serialization** — only one chat commits at a time. Defeats fleet parallelism.

## Why this matters

- **Attribution rot** — `Recent regressions` in CLAUDE.md and `MILESTONE_PROGRESS` parsing rely on `[SCOPE]/U-ID` commit subjects matching the file contents. Absorption breaks that contract: a commit subject U-OSC9-09 (oscar SFC-9AXIS work) now contains U-V3 (quebec motion tokens) in its diff. `build-milestone-progress.mjs` will credit U-V3 to OSCAR-SFC-9AXIS-MS0 instead of UI-UX-IMPROVEMENT-MS0.
- **Roll-back blast radius** — `git revert <peer-commit>` to undo someone else's bug now also reverts your work that got absorbed.
- **Code review attribution** — `git blame` on motion.ts will name the operator's email, but the commit subject (oscar) is wrong — reviewers looking for "who built motion tokens?" follow the wrong thread.
- **Per-slot claim discipline** — `slot-task-claim.mjs` records "quebec is building U-V3" but the git history records "oscar built U-V3". The two systems disagree.

## Next actions

- Operator decision needed: re-enable the slot-bridge hooks (recreate slot worktrees first) OR adopt a `git commit -i <files>` discipline OR accept absorption rate as cost of fleet parallelism.
- If keeping current state: add a `[SCOPE]/U-ID-ABSORBED-FROM-<other-commit>` ledger so attribution rot is auditable.
- Tracked as candidate unit `U-SHARED-TREE-ABSORPTION-FIX` for future roadmap pickup.

## Cross-references

- `feedback_slot_bridge_hooks_disabled` — the disable directive that opened this gap.
- `feedback_commit_to_slot_worktree` — the original doctrine that this empirical reading validates.
- `feedback_conflict_fork_rule` — the previously-named mitigation (fork to sibling worktree).
- `knowledge/wiki/architecture/slot-bridge-hooks-disabled-2026-05-26.md` — the disable doctrine + re-arm path.
