---
name: commit-to-slot-worktree
description: "Every chat MUST commit to its NATO-named slot worktree (H:/prism-slot-<name> on branch slot/<name>), not the shared H:/prism tree. Shared-tree commits get absorbed into peer commits — content survives but attribution is lost (3 absorbed commits observed in single golf session 2026-05-24)."
aliases: feedback_commit_to_slot_worktree
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.420Z
---


# Commit to the slot worktree, NOT the shared H:/prism tree

## The rule

**Every active chat commits to its slot worktree, not `H:/prism`.** A chat bound to slot `<nato>` lives in `H:/prism-slot-<nato>` on branch `slot/<nato>`. All staging and committing happens there. The shared `H:/prism` tree is the **integrator's** territory (golf merges slot branches into `cad-fusion-live-ms0`).

## Why: the shared-tree absorption pattern

When 6-26 chats share `H:/prism` and stage files concurrently, every chat's `git add` sees every other chat's staged files. The first chat to land a commit absorbs ALL currently-staged work under its commit subject — even unrelated files from peers. Observed in a single golf session 2026-05-24:

1. `U-NN-PREDICTOR-EMBED-WIRE` (3 files, 45+103 tests, NN/GNN B8 unblock) → absorbed into bravo's `2d931e3551` ([[reference_hermes_mcp_plugin_inventory_ms0_2026_05_24|HERMES-MCP-PLUGIN-INVENTORY-MS0]] MS-ENVELOPE).
2. `U-SYSTEM-VIZ-PSN-AWARE` (1 file, /system-viz skill PSN-render-substrate doc) → absorbed into another peer commit.
3. `U-PSN-PROMPT-CHECKLIST-INJECT` (2 files + settings wire, the forcing function) → absorbed into papa's `ec8c38aa9c` (BLUEPRINT-OCR-EVAL/U-EVAL-COVERAGE-PROOF).

Content was durable in main in every case (the work shipped). But:
- Attribution is wrong (the commit subject doesn't name the actual unit)
- Roadmap close-out can't credit the unit (build-milestone-progress.mjs greps commit subjects for `[SCOPE]/U-ID` — finds nothing)
- Git blame / log / forensics point at the wrong author/scope
- `git log -- <file>` shows misleading history

## How to apply

**At /checkin-`<slot>` time**, the canonical checkin pipeline already includes Step 2c — slot-worktree cutover. It migrates the chat onto `slot/<nato>` branch in `H:/prism-slot-<nato>`. Once there:
- `worktree-commit-route` hook routes commits to the slot worktree
- `git-add-lane-guard` blocks adds outside the lane
- `main-tree-write-block` blocks Edit/Write into the shared `H:/prism` tree

**If you find yourself still in `H:/prism`** (you can tell from `pwd` or `git rev-parse --show-toplevel`), and you have non-trivial work to commit, **migrate before committing**:

```bash
# Reuse the /checkin-<slot> Step 2c cutover.
# OR manual:
git -C H:/prism worktree add H:/prism-slot-<nato> -b slot/<nato> 2>/dev/null
cd H:/prism-slot-<nato>
# Copy/restage your work here, commit, push.
```

**If a one-off fix in main is truly the right call**, that's fine — but explicitly justify it ("Yes, this is a doc-only edit; absorption risk is minimal because peers aren't touching .claude/commands/").

## What to expect

- **Slot worktree commits** show up with your slot's branch in `git log` and the correct `[SCOPE]/U-ID` subject.
- **No more absorption.** Peers can't stage your slot's files because they're in a different worktree.
- **Golf integrates.** When ready to merge a slot branch into main, golf or a designated integrator does `git -C H:/prism merge slot/<nato>` (or the equivalent merge-train).

## Why this isn't already enforced everywhere

Migration is per-chat. A chat that came up before SLOT-WORKTREE-MS0 (mid-2026-05-16) may still be in main. Operator-typed `/checkin-<slot>` triggers Step 2c — but a chat that resumes post-/compact without re-running checkin may still be in the shared tree. The 3 enforcement hooks only arm once `chat-slots.json[<slot>].branch` starts with `slot/`.

**If you're golf**, you ARE the integrator — committing in main is normal AS LONG AS your work is integration / hygiene / merge-related. For golf's own feature work (engines, hooks, skills), still prefer `slot/golf` to avoid absorbing your own work into peer commits.

## Linked

- [[reference_slot_worktree_activation_2026_05_16]] — the migration architecture
- [[feedback_conflict_fork_rule]] — earlier fallback (worktree add ad-hoc) when migration not yet done
- [[feedback_commit_prefix_main_on_shared_tree]] — `[MAIN]` prefix for shared-tree commits as the legacy interim
- CLAUDE.md §PER-CHAT HANDOFF (Lane discipline + conflict-fork rule)
- CLAUDE.md §SLOT-WORKTREE-MS0 (full architecture)
