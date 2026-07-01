---
name: reference-slot-bridge-ms0-2026-05-26
description: SLOT-BRIDGE-MS0 — auto-seed branch binding on first claim. Closes the silent 25/26-slot disarmament gap.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.206Z
aliases: reference_slot_bridge_ms0_2026_05_26
---


# SLOT-BRIDGE-MS0 — auto-seed slot-branch binding on first claim

**Date:** 2026-05-26 · **Slot:** alpha (`claude-227a8626`) · **Tests:** 22/22 + 3/3 e2e PASS

## The gap

The 3 slot-worktree enforcement hooks (`worktree-commit-route` +
`git-add-lane-guard` + `main-tree-write-block`) ALL key off a single field:
`chat-slots.json[slot].branch.startsWith("slot/")`. U-WAVE5a (2026-05-19)
built `state/shared/slot-branch-bindings.json` as the per-slot sidecar so
the binding overrides `input.branch` even when `/checkin` runs from
`H:/prism` shared tree. **The mechanism was complete, but the data was
not seeded** — only `alpha` had a binding entry.

Result: 25/26 slots silently unarmed. Every peer's commits drifted to
the shared tree, regressing per [[feedback_commit_to_slot_worktree]]
(the same class of bug that absorbed 3 separate slot-golf commits in
a single session 2026-05-24).

## The fix (4 units)

### U-SBB01 — `scripts/seed-slot-branch-bindings.mjs`
One-shot seeder. Idempotent. Seeds all 25 work slots
(`alpha..foxtrot, hotel..zulu`). Golf EXEMPT per integrator invariant
(matches `main-tree-write-block.mjs:108 INTEGRATOR_SLOT = "golf"`).
Uses the public `writeSlotBranchBindings()` API for schema validation.

```bash
node scripts/seed-slot-branch-bindings.mjs --dry-run  # preview
node scripts/seed-slot-branch-bindings.mjs            # apply
```

First run: 24 new bindings written (alpha was already present).

### U-SBB02 — `scripts/backfill-chat-slots-branch.mjs`
The binding-override fires on next claim/heartbeat — so for live
already-claimed peers, this script directly patches `chat-slots.json`
so the hooks arm IMMEDIATELY without waiting. Atomic write via the
same primitives `chat-slots.mjs` uses; only touches slots that (a)
have a binding AND (b) currently differ. Golf doubly-protected:
never has a binding AND never overwritten.

First run: 17 stale slots → `slot/<nato>`. Total armed: **19/19 live
non-empty slots** (was 1/19, all on alpha).

### U-SBB03 — `chat-slots.mjs` `claimSlot()` self-healing auto-seed
The single chokepoint patch — inside `inputForSlot()`, if
`slot !== "golf"` AND `slotBindings[slot]` is missing, write the
binding before applying the override:

```js
if (slot !== INTEGRATOR_SLOT_NAME && !slotBindings[slot]) {
  const want = `slot/${slot}`;
  const r = writeSlotBranchBindings({ [slot]: want }, { path: bindingsPath });
  if (r && r.ok) slotBindings[slot] = want;
  // fail-soft per R12: errors → stderr, claim still succeeds
}
```

Means: **every NEW chat that claims a slot in the future auto-arms** —
no operator action ever again. New NATO slot added? First claim seeds
it. New chat in any existing slot? Binding already there. Self-healing.

The constant `INTEGRATOR_SLOT_NAME = "golf"` is declared at top of
`chat-slots.mjs` and MUST stay aligned with the same constant in
`main-tree-write-block.mjs:108`.

### U-SBB04 — `scripts/verify-slot-bridge-enforcement.mjs`
Pure-core verifier (`decideOnEdit()` + `resolveSlotBinding()` against
live `chat-slots.json`). Cannot use the standalone hook because
`resolveSessionId()` spawns `stable-session-id.mjs` against the CURRENT
process tree — a CLI test always sees the running chat's slot, not the
slot we want to exercise.

Three cases:
- non-alpha armed slot writing to main tree → MUST BLOCK
- same slot writing inside its own worktree → MUST ALLOW
- golf writing to main tree → MUST ALLOW (integrator invariant)

First run: 3/3 PASS. Exit-code suitable for CI gate.

## Test contract change (per R9 — tests verify intent)

Two `chat-slots-bindings.test.mjs` tests encoded the OLD pre-2026-05-26
contract ("no binding → no override"). Rewritten + augmented:

| Before | After |
|---|---|
| `no binding leaves input.branch intact` | `no binding auto-seeds for non-golf slot` + `golf is EXEMPT from auto-seed` |
| `bindings file missing is fail-soft (no override)` | `bindings file missing → auto-seeds on first non-golf claim` + `bindings file missing + golf claim → file NOT created` |

Golf-exempt invariant now doubly-guarded across file-present + file-missing
cases. Net: 18→22 tests; all 22 PASS.

## How to re-arm the fleet from scratch (recovery)

```bash
node scripts/seed-slot-branch-bindings.mjs
node scripts/backfill-chat-slots-branch.mjs
node scripts/verify-slot-bridge-enforcement.mjs  # 3/3 PASS = healthy
```

## Doctrine notes

- Per [[feedback_commit_to_slot_worktree]]: closes the silent regression
  that absorbed 3 golf commits in a single session 2026-05-24.
- Per [[reference_slot_worktree_activation_2026_05_16]]: the worktrees +
  hooks existed already; this milestone seeded the missing data.
- Per [[feedback_golf_owns_reaper]] + integrator role: golf is the ONLY
  slot exempt — both at seed time AND at runtime auto-seed.
- Per [[feedback_psn_definition]]: this work touches PSN leg #2 (PRISM OS)
  via slot routing + leg #7 (Engines) via `chat-slots.mjs` claim path.
- Per [[feedback_reflect_all_changes_post_update]]: doc surfaces updated
  in same session — RECENT-SHIPMENTS inbox (CLAUDE.md guard blocks
  direct edit from alpha), memory (this file), wiki entry (sibling),
  Obsidian (auto-feeds on Stop via stop-obsidian-memory-feed.mjs).
