---
title: Slot-worktree migration status — Wave 5c audit
date: 2026-05-19
authoring_session: claude-d7f91ed3 (slot=echo)
spec_status: ADVISORY
mustHumanVerify: true
parent_spec: state/shared/specs/SESSIONSTART-HOOK-AUDIT-2026-05-19.md
unit: SLOT-COMPACT-SYNERGY-MS0/U-WAVE5c
related:
  - knowledge/wiki/architecture/slot-worktree-ms0.md
  - state/shared/SLOT-WORKTREE-ARCHITECTURE.md
---

# Slot-worktree migration status — Wave 5c audit

## TL;DR

The SLOT-WORKTREE-MS0 architecture defines 13 slot worktrees at
`H:/prism-slot-<nato>` on branches `slot/<nato>` and three lane-routing hooks
(`main-tree-write-block`, `git-add-lane-guard`, `worktree-commit-route`) that
arm per-chat once `chat-slots.json[slot].branch` starts with `slot/`. The
hooks ship and the bootstrap script exists, but **0 of 13 NATO slots have
their bootstrap state actually applied**. Every active chat is editing the
shared `H:/prism` main tree where the lane-routing hooks stay dormant — the
documented multi-chat lane discipline is effectively unenforced fleet-wide.

## Method

1. `git worktree list` (run 2026-05-19 ~15:18 local) enumerates the actual
   worktrees on disk.
2. `node H:/prism/.claude/helpers/chat-slots.mjs status` enumerates the
   per-slot state including the `branch` field that the lane-routing hooks
   gate on.

## Findings

### Disk: NO `slot/*` worktrees exist

Of ~21 worktrees registered with this repo, all named worktrees fall into
three buckets:

- **Main tree:** `H:/PRISM` on `cad-fusion-live-ms0`
- **Subagent worktrees** (created by Agent-tool spawns): `H:/PRISM/.claude/worktrees/agent-<hex>` on `worktree-agent-<hex>` — ephemeral, NOT slot worktrees
- **Ad-hoc `work/*` worktrees** (manual conflict-fork per [[feedback_conflict_fork_rule]]): e.g. `H:/prism-cad-complete` on `work/cad-complete-ms0`, `H:/prism-cam-exhaust-ms0` on `work/cam-exhaust-ms0` — NOT slot worktrees

**Zero worktrees match the `slot/<nato>` branch pattern** the lane-routing
hooks gate on.

### chat-slots.json: branch field unset or wrong

Sampled from `chat-slots.mjs status` (live, this session):

| Slot    | branch                  | host  | status    | terminal     |
|---------|-------------------------|-------|-----------|--------------|
| alpha   | `null`                  | MarkV | crashed   | tw-ps-30788  |
| bravo   | `cad-fusion-live-ms0`   | MarkV | crashed   | tw-pp-39392  |
| charlie | (sampled — see live)    | MarkV | crashed   | (live)       |
| echo    | `cad-fusion-live-ms0`   | MarkV | active    | tw-pp-38432  |

`branch` is either `null` (slot was claimed by `session-start-auto-pin`
before the chat called `/checkin-<nato>`) OR points at the **main**
`cad-fusion-live-ms0` branch. None point at `slot/<nato>`. The three
lane-routing hooks check `state.branch?.startsWith("slot/")` and silently
do nothing on every prompt in every active chat. The 13-chat fleet is
operating entirely in the shared main tree.

### Class of bugs this causes (already observed)

Each of the following has a memory or CLAUDE.md entry from a recent
session demonstrating it:

- **Cross-chat commit misattribution** ([[reference_cross_chat_commit_misattribution_2026_05_18]]
  + this session's `e330343ee7` / `c020ebb7b6` cases): peer chat's
  `git commit -a` sweeps another chat's staged work into a misnamed
  commit. The shared main tree's single git index is the substrate.
- **Same-unit collisions:** golf's `ba04aff4c1`
  `[SLOT-COMPACT-SYNERGY-MS0]/U-WAVE3` and echo's `b343b6bfd7`
  `[SLOT-COMPACT-SYNERGY-MS0]/U-WAVE3` shipped different work under the
  same scope/U-ID this session. A slot worktree per chat would have
  surfaced this at commit time (separate branches).
- **Git index saturation** ([[reference_git_index_saturation_camx11_2026_05_18]]):
  >98% lock-rate under 16-chat load on the shared `H:/prism` index;
  observed multiple times this session (Wave 4a took two retries because
  `git add` repeatedly hit `index.lock: File exists`). Per-chat slot
  worktrees would distribute lock contention.

## Open units (queued, NOT shipped this session)

Honest R12 scope: this Wave 5c entry is a FINDINGS-ONLY measurement. The
mechanical fixes have not been implemented this session — they are queued
as follow-up units against `SLOT-COMPACT-SYNERGY-MS0`:

### `U-WAVE5a` — extend slot-worktree-bootstrap.mjs --apply

Make `scripts/slot-worktree-bootstrap.mjs --apply` (live since SLOT-WORKTREE-MS0)
also write `chat-slots.json[slot].branch = "slot/<nato>"` on first bootstrap.
Today the script creates the worktree on disk and the branch in git, but
leaves the `chat-slots.json` `branch` field untouched. Result: the
operator runs the bootstrap, the slot/<nato> worktree exists, but no chat
ever ends up bound to it because `chat-slots.mjs claim` writes back its
own `branch` (the branch of `git rev-parse --abbrev-ref HEAD` at claim
time — which is `cad-fusion-live-ms0` because the chat hasn't migrated
yet). The bootstrap script needs to set the field BEFORE the chat claims.

### `U-WAVE5b` — operator migration runbook in `/checkin-<nato>`

Add a "How to migrate to your slot worktree" section to the canonical
`/checkin` skill body so every NATO wrapper inherits it. The advisory
hook (`slot-worktree-cwd-advisory.mjs`, shipped Wave 1) names the
problem but doesn't walk the operator through the fix. The runbook
should be a literal copy-paste sequence:

```bash
# In a fresh PowerShell window (NOT the current chat — Claude CLI can't change cwd mid-session):
cd H:/prism-slot-<nato>
claude
# slot-bind-enforce will re-pin you to <nato> from the new cwd, AND
# the lane-routing hooks will activate because chat-slots.json[<nato>].branch
# will now start with "slot/" (assuming U-WAVE5a has shipped first).
```

### `U-WAVE5c-AUTO` — promote this audit script to a cron

The 2-command sequence (`git worktree list` + `chat-slots.mjs status`) that
produced this report should become `scripts/slot-worktree-migration-status.mjs`
and run on a 1h cron, writing `state/shared/SLOT-WORKTREE-MIGRATION-STATUS.json`
+ `.md` so this audit is always live, not session-bound. Once shipped,
remove the `mustHumanVerify: true` from this spec.

## Notes

- **Slot worktree files DO exist** at `H:/prism-slot-<nato>` per the SLOT-WORKTREE-MS0
  ship doc — they were just never used. Or the disk inventory has drifted; a
  follow-up should `git worktree list` against `slot/*` specifically to confirm.
- **Golf is exempt by design** from the slot/* convention — it's the
  integrator and stays on the main branch.

## Do not act on this without operator approval

This is an ADVISORY measurement spec. It does NOT mutate `chat-slots.json`
or the worktree state. The fix (U-WAVE5a) requires changing a script that
runs against the operator's filesystem and may force-checkout branches;
the operator must consent before that ships. Default action on read: queue
U-WAVE5a/b/c-AUTO as units and surface them at `/pick-unit`.
