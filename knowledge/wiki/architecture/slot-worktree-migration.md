---
title: Slot worktree migration — how to leave the shared main tree
type: architecture
status: live
last_verified: 2026-05-19
parent_layer: L8
related:
  - knowledge/wiki/architecture/per-slot-claim-ms0.md
  - knowledge/wiki/architecture/slot-bind-enforce.md
  - knowledge/wiki/architecture/slot-reclaim.md
  - state/shared/SLOT-WORKTREE-ARCHITECTURE.md
  - state/shared/specs/SLOT-WORKTREE-MIGRATION-STATUS-2026-05-19.md
tags: [architecture, slot-worktree, lane-routing, multi-chat, doctrine]
---

# Slot worktree migration

The SLOT-WORKTREE-MS0 architecture (shipped 2026-05-15) gives each of the 13 NATO chat slots its own git worktree at `H:/prism-slot-<nato>` on a `slot/<nato>` branch off `origin/cad-fusion-live-ms0`. Three PreToolUse hooks (`main-tree-write-block`, `git-add-lane-guard`, `worktree-commit-route`) arm per-chat *once* `chat-slots.json[slot].branch` starts with `slot/` — they keep multi-chat commits from clobbering each other across the shared main tree's single git index.

**Status today** (per 2026-05-19 Wave 5c finding): 0/13 NATO slots are migrated. Every active chat is editing `H:/prism` and the lane-routing hooks stay silently dormant. This entry is the canonical operator-facing runbook to fix that.

## What's blocking migration

`chat-slots.json[slot].branch` always points at `cad-fusion-live-ms0` because `/checkin`'s `git rev-parse --abbrev-ref HEAD` returns the **shared main-tree** branch. The lane-routing hooks gate on `state.branch?.startsWith("slot/")`; without that prefix they no-op.

U-WAVE5a (2026-05-19) closes the gap with a sidecar — `state/shared/slot-branch-bindings.json`. `slot-worktree-bootstrap.mjs --apply` (default ON) writes one entry per created/existing slot worktree; `chat-slots.claimSlot()`, `heartbeat()`, and `setPipelineStep()` all consult the sidecar and override `input.branch` with the binding. So once the bootstrap runs once, the lane-routing hooks arm regardless of where `/checkin` was launched from.

## The one-time operator migration

### Step 1 — bootstrap your slot worktree (if not already on disk)

From any PowerShell window:

```bash
node H:/prism/scripts/slot-worktree-bootstrap.mjs --slots <nato>
# e.g. --slots echo  (omit to bootstrap all 13)
```

This creates `H:/prism-slot-<nato>` on branch `slot/<nato>`, junctions `node_modules`, and writes `state/shared/slot-branch-bindings.json` (`--no-slot-branch-binding` to opt out — usually wrong, defeats the entire unit).

### Step 2 — open a NEW PowerShell window in the slot tree

```powershell
# Close the current Claude chat first (or leave it; the next claim takes the slot).
cd H:/prism-slot-<nato>
claude
```

`slot-bind-enforce` re-pins you to `<nato>` from the new cwd. `chat-slots.json[<nato>].branch` now reads `slot/<nato>` (either via the sidecar override or because `git rev-parse --abbrev-ref HEAD` actually returns the slot branch from the new cwd). The 3 lane-routing hooks arm automatically.

You can verify with:

```bash
node H:/prism/scripts/slot-worktree-migration-status.mjs   # U-WAVE5c-AUTO
```

Output names which slots are migrated vs still drifting.

### Step 3 — there is no step 3

Once migrated, every commit from that chat routes to the slot branch, `git add` rejects paths outside the slot tree, and edits into `H:/prism` are blocked. The integrator slot (`golf`) handles cross-slot integration via `scripts/slot-integrator.mjs`.

## Why a new PowerShell window?

Claude CLI cannot change cwd mid-session. Migrating in-place would require the harness to re-resolve every file path, re-read CLAUDE.md, re-bootstrap MCP servers — too much state churn. A fresh shell + `claude` is one command and re-uses the slot via terminal-pin if the window was already bound.

## Bug class this kills

The 13-chat fleet today produces these silent regressions (from the Wave 5c finding spec):

- **Cross-chat commit misattribution** ([[reference_cross_chat_commit_misattribution_2026_05_18]]): peer's `git commit -a` sweeps another chat's staged work into a misnamed commit. Single shared git index = single global staging area.
- **Same-unit collisions**: golf and echo both shipping commits under `[SLOT-COMPACT-SYNERGY-MS0]/U-WAVE3` because the lane gate doesn't catch the duplicate at commit time.
- **Git index saturation** ([[reference_git_index_saturation_camx11_2026_05_18]]): >98% lockrate on `H:/prism/.git/index.lock` under 16-chat load.
- **Compounded `index.lock` retries**: `git add` repeatedly hits `index.lock: File exists` on burst writes.

All four collapse once each chat commits to its own slot worktree.

## Doctrine pins

- **Never delete the main tree.** `H:/prism` stays as the integrator's home + the shared `node_modules`/build artifact source. Slots junction `node_modules` from it (`--no-node-modules-junction` opts out).
- **Golf is exempt.** The hygiene slot integrates slot branches into `cad-fusion-live-ms0` via `scripts/slot-integrator.mjs`. Don't migrate golf.
- **The sidecar wins, not `input.branch`.** If `chat-slots.json[slot].branch` reads `slot/<nato>` after a claim, you can trust the binding fired. Operator-passed `--branch` is intentionally overridden (this is the fix, not a bug).

## Related units

- **U-WAVE5a** (2026-05-19, commit `9445b05e2e`) — bindings sidecar + chat-slots consumption.
- **U-WAVE5b** (2026-05-19) — this runbook + canonical /checkin section.
- **U-WAVE5c-AUTO** (2026-05-19) — `scripts/slot-worktree-migration-status.mjs` cron + JSON+MD dashboard.

## See also

- [[per-slot-claim-ms0]] — per-slot UNIT claim layer (atop the slot binding).
- [[slot-bind-enforce]] — UserPromptSubmit hook that re-pins on every prompt.
- [[slot-reclaim]] — post-/compact slot reclaim mechanics.
- `state/shared/SLOT-WORKTREE-ARCHITECTURE.md` — full architecture document.
