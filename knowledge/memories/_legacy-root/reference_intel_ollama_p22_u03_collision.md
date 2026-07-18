---
name: reference-intel-ollama-p22-u03-collision
description: "3rd shared-tree commit collision in 48 h — my INTEL-OLLAMA-OBSIDIAN-MS0/P22-U03 (/pre-review skill, 456 lines + envelope flip) shipped via peer's f2c0ae42a [TRAINING-LEARNING-MS0/U-TL-U3-CLOSEOUT-V2] commit; my own a8506f828 commit captured peer's auto-staged AUTO-LEARNING-LOOP-MS0.json instead. Race-intensity threshold for fork-first behaviour confirmed."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.463Z
aliases: reference_intel_ollama_p22_u03_collision
---


# INTEL-OLLAMA-OBSIDIAN-MS0 / P22-U03 collision — 2026-05-13

3rd shared-tree commit collision in 48 h on `H:/prism` (companion to
[[reference_training_learning_ms0_u1_collision]] and
[[reference_coord_ms0_u4_collision]]).

## What I shipped

- **`.claude/commands/pre-review.md`** (456 lines) — /pre-review slash command,
  manual entry to the DeepSeek-R1 pre-Claude review pattern. Self-contained
  against locally-installed `deepseek-r1:14b` (8.9 GB). Uses raw `curl
  /api/generate` (NOT the unshipped P22-U01 engine) so works today.
- **`mcp-server/data/milestones/INTEL-OLLAMA-OBSIDIAN-MS0.json`** —
  P22-U03 envelope flip: `status:"completed"`, `completed_at:"2026-05-13T17:19:41.431Z"`,
  `completed_by:"claude-c6ed799c"`.

## Where it actually landed in git history

```
f2c0ae42a [MAIN] [TRAINING-LEARNING-MS0]/U-TL-U3-CLOSEOUT-V2: envelope status flip ...
```

`git log -- .claude/commands/pre-review.md` shows `f2c0ae42a` as the latest
commit on my file. The commit title is about TRAINING-LEARNING but its
content is mostly mine (+ peer's TRAINING-LEARNING envelope flip).

## Where my OWN commit went

`a8506f828 [INTEL-OLLAMA-OBSIDIAN-MS0]/P22-U03: /pre-review skill — DeepSeek-R1 manual draft`

Title is correct (`[INTEL-OLLAMA-OBSIDIAN-MS0]/P22-U03: ...`) but content is
`+23/-2` lines of `mcp-server/data/milestones/AUTO-LEARNING-LOOP-MS0.json`
(peer's auto-staged file). My pre-review.md and envelope were NOT in this
commit — a peer hook auto-staged AUTO-LEARNING-LOOP and unstaged my files
between my `git add` and `git commit`.

## Why this kept happening

Active peer chats during my work:
- Chat staging `cadRegressionWorkerThreadRunner.test.ts`, `CADRegressionWorkerThreadRunnerEngine.ts`, `cadRegressionDispatcher.ts` (CAD-INFRA-MS0)
- Chat staging `devDispatcherPeerAudit.test.ts`, `devActionSchemas.ts`, `devDispatcher.ts` (CLEANUP-MS0/U-CLEANUP-B2)
- Chat shipping TRAINING-LEARNING-MS0/U-TL-U3-CLOSEOUT (commits f1996657d, 722bb7dd9, f2c0ae42a)
- Chat shipping CLEANUP-MS0/U-CLEANUP-B2-CLOSEOUT (b7f8eff4d)

Every `git add` I issued landed in a window where another chat had ALREADY
staged its own files. The hooks `work-claim.mjs` / auto-stage / commit-route
treated my `add` as one piece of a peer's batch.

## Pre-existing collisions (for pattern stability)

| Date | Unit | Absorbed-into | My commit |
|------|------|---------------|-----------|
| 2026-05-12 | BLUEPRINT-OCR-TRAINING-MS1 | `847b8ec8b [INFRA-CONSENSUS-WIRE-MS0]/P0-U01` | (none — pre-claim) |
| 2026-05-13 | TRAINING-LEARNING-MS0/U-TL-U1 | `5ae6f77c7 [ACP-MS0]/CLOSE-STATE-U01` | (none — pre-claim) |
| 2026-05-13 | COORD-MS0/U-COORD04 | `b12074821 [TRAINING-LEARNING-MS0]/U-TL-U2-CLOSEOUT` | (none — pre-claim) |
| 2026-05-13 | INTEL-OLLAMA-OBSIDIAN-MS0/P22-U03 | `f2c0ae42a [TRAINING-LEARNING-MS0]/U-TL-U3-CLOSEOUT-V2` | `a8506f828` (title-correct, content-hijacked) |

## What worked / didn't

**Worked**:
- Per-file scrutiny (3 rounds — reviewer B caught 5 P0s across rounds that A missed)
- 4-surface close-out doctrine (envelope flip on disk survived the race)
- Chat-bus post documents the collision for the next session

**Didn't work**:
- `git add` + `git commit` atomicity in a 4-chat-concurrent shared tree
- `--only` flag (file wasn't tracked because `.claude/commands/` is gitignored)
- `git stash --keep-index` (briefly stashed peer's auto-regen state, recoverable)
- Forking to worktree (worktree-add hung for >5 min on contended .git)

## Mitigation for next time

[[feedback_conflict_fork_rule]] — fork BEFORE the first race hits, not after.
Threshold: if `git status --short` shows ANY peer-staged files at /checkin or
/pick-unit, fork immediately to `H:/prism-<slot>-<topic>/` worktree BEFORE
writing the first deliverable file. The cost (one `git worktree add`) is
recoverable; the cost of a hijacked commit + memory entry like this is not.

If the worktree-add itself contends (as it did here at 17:30 UTC), don't kill
it — let it run in background while continuing other work, then merge back
via `git merge --ff-only work/<slot>-<topic>` per
[[reference_reverse_merge_then_ff_only]].

## Files to NOT re-create thinking they're missing

- `.claude/commands/pre-review.md` — 456 lines, present in HEAD via `f2c0ae42a`
- `mcp-server/data/milestones/INTEL-OLLAMA-OBSIDIAN-MS0.json` phase 22 unit 2:
  status `completed`, completed_at `2026-05-13T17:19:41.431Z`

Source of truth = HEAD content under those paths, NOT the commit titles.

## Sibling unit status (verified absent — do build separately if needed)

- **P22-U01** — `mcp-server/src/engines/PreReviewOrchestratorEngine.ts` — NOT BUILT
- **P22-U02** — `.claude/hooks/pre-claude-review-inject.mjs` — NOT BUILT (peer's
  earlier commit `f82b67fe2` shipping this hook was rewritten out of history
  during the 2026-05-12 git history strip, see
  [[reference_git_history_strip_event_2026_05_12]])
- **`scripts/claim-pre-review-gpu.mjs`** — NOT BUILT (cited as future in skill)

## Companion memory entries

- [[feedback_conflict_fork_rule]] — fork-first rule (now load-bearing every iter)
- [[feedback_roadmap_close_out]] — 4-surface close-out doctrine
- [[feedback_always_close_out]] — finish every facet before reporting done
- [[reference_training_learning_ms0_u1_collision]] — 1st collision in this 48 h
- [[reference_coord_ms0_u4_collision]] — 2nd collision in this 48 h
- [[reference_blueprint_ocr_training_ms1_collision]] — collision from 2026-05-12


## Related
[[engines/CADRegressionWorkerThreadRunnerEngine|CADRegressionWorkerThreadRunnerEngine]] • [[engines/PreReviewOrchestratorEngine|PreReviewOrchestratorEngine]] • [[skills/prism|/prism]] • [[skills/commands|/commands]] • [[skills/pre-review|/pre-review]] • [[skills/api|/api]] • [[skills/generate|/generate]] • [[skills/data|/data]] • [[skills/milestones|/milestones]] • [[skills/-|/-]]