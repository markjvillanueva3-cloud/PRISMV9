---
name: slot-worktree-playbook
category: software-engineering
domain: backend-dev
tags: [slot-worktree, git-worktree, multi-chat, branch-routing, prism-development, ai-development]
last_updated: 2026-05-18
---

# Slot Worktree Playbook — concrete commands + troubleshooting

PRISM's 26-chat fleet uses per-slot worktrees to prevent shared-tree commit collisions. `H:/prism-slot-<name>` on branch `slot/<name>`. This is the operator's runbook.

## When to migrate

Migrate when: the chat is on the shared `H:/prism` main tree AND another chat is editing the same files; OR `worktree-commit-route.mjs` is blocking commits; OR cross-tree-collision-advisory Stop hook fires; OR `/checkin-<slot>` is invoked fresh.

Don't migrate when: you're golf (integrator stays on merge branch); work is scoped to a file no peer touches; a worktree for this slot already exists.

## The cutover procedure

1. Stash current changes: `git stash push -u -m "pre-slot-cutover"`
2. Create the slot worktree: `git worktree add H:/prism-slot-lima -b slot/lima`
3. cd to the new worktree and re-claim slot with the new path: chat-slots.mjs claim with --preferSlot, --force true, --branch slot/lima
4. Pop the stash if needed

After cutover, 3 hooks arm automatically: main-tree-write-block (blocks Edit/Write into H:/prism), git-add-lane-guard (blocks git add for paths outside lane), worktree-commit-route (routes commits to the slot worktree).

## Common cutover failures

**Lock contention on .git/index.lock** — concurrent peer write. Wait 10s, retry, or remove if confirmed stale.

**"branch already checked out elsewhere"** — the slot/<name> branch is bound to a different worktree. Find with `git worktree list`. If stale, `git worktree remove --force` then re-create.

**File-claim conflicts** — peer holds a claim in main tree. Resolve via `prism_context:release_file` after peer confirms, or wait for 30-min expiry.

**Settings-file shared but slot-pinned hooks** — `.claude/settings.json` lives in BOTH main and slot worktree (worktrees share .git but NOT working tree). Re-run `c-to-h-mirror.mjs --apply` to sync.

## The conflict-fork fallback

If cutover is blocked AND peer chats own files you need:

`git worktree add ../prism-<scope> -b work/<scope>`

Branch named `work/<scope>` (not `slot/<scope>`) keeps the per-slot routing hooks dormant. Independently mergeable; ship via PR.

## Integrator (golf) merge protocol

Golf is exempt from main-tree-write-block. It integrates slot branches into the merge branch (cad-fusion-live-ms0 currently): fetch all, merge --no-ff each slot/<name> in turn, push.

Merge conflicts: resolve preferring the slot whose unit is the canonical owner per atomic-roadmap.json lane assignment.

## Slot-task-claim integration

Slot worktrees pair with slot-task-claims for unit-level locking. Commit with `[SCOPE]/U-ID` format → post-commit hook auto-releases. Manual release: `slot-task-claim.mjs release --slot --unit`.

## Cross-PC fleet caveat

Slot IDs are NOT host-pinned. Each PC's fleet-reaper filters by host (FLEET-REAPER-MS2/U-FR-S3). Worktree paths are per-PC — never checkout a slot/<name> branch from PC-A's worktree onto PC-B.

## Cleanup

When work is done and merged: `git worktree remove H:/prism-slot-lima`; then remove the slot/<name> branch only after merge confirmed (use the safe-refuse-if-unmerged delete, not the force flag).

If `git worktree remove` complains about dirty state but changes are merged: check `git status` in the slot worktree; if unmerged work exists, cherry-pick what's needed; force-remove only after backup.

## Knobs

- `PRISM_WORKTREE_ROUTE_ENABLE=1` enables worktree-commit-route advisory (default off)
- `PRISM_CROSS_TREE_ADVISORY_DISABLE=1` silences cross-tree Stop advisory
- `PRISM_GOLF_GUARDIAN_DISABLE=1` opt-out for golf-owns-reaper hook

## Related

- [[multi-chat-coordination]] — the 5 coordination mechanisms
- [[engine-creation-playbook]] — what to do once in the slot worktree
- CLAUDE.md PER-CHAT HANDOFF + PER-SLOT-CLAIM-MS0
- CLAUDE.md FLEET-REAPER-MS2 — cross-PC host filter
