---
title: SLOT-BRIDGE-MS0 — auto-seed branch binding on first claim
date: 2026-05-26
slot: alpha
type: architecture
status: shipped
related:
  - architecture/slot-worktree-ms0
  - lessons/slot-worktree-enforcement-not-actually-active
  - lessons/bug-findings-wiki-gate
---

# SLOT-BRIDGE-MS0 — auto-seed branch binding on first claim

## Problem

The 3 slot-worktree enforcement hooks (`worktree-commit-route`,
`git-add-lane-guard`, `main-tree-write-block`) all key off
`chat-slots.json[slot].branch.startsWith("slot/")`. U-WAVE5a (2026-05-19)
built the per-slot sidecar `state/shared/slot-branch-bindings.json` so
the binding overrides `input.branch` whenever a chat heartbeats from the
shared tree. The mechanism was complete and tested, but **the data was
never seeded** — only `alpha` had an entry.

Empirical fleet state on 2026-05-26 (before fix):
- 19 live non-empty slots
- 1 armed (alpha → `slot/alpha`)
- 18 unarmed (16 on `cad-fusion-live-ms0`, 2 on `null`)
- → enforcement hooks dormant on every chat except alpha

Consequence: peer commits silently routed to the shared tree, causing
absorption-by-peer-commit (3 golf commits absorbed in a single session
2026-05-24 per [[feedback_commit_to_slot_worktree]]).

## Architecture

```
┌────────────────────────┐
│  /checkin-<slot> claim │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────────────────────────┐
│ chat-slots.mjs claimSlot(input)            │
│ ├─ readSlotBranchBindings(bindingsPath)    │
│ └─ inputForSlot(slot):                     │
│    ├─ AUTO-SEED if missing AND slot!=golf  │ ◄── U-SBB03
│    │  └─ writeSlotBranchBindings({slot})   │
│    └─ override input.branch if bound       │
└──────────┬─────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────┐
│ chat-slots.json[slot].branch = "slot/<n>"  │
└──────────┬─────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────┐
│ Edit/Write attempt                         │
│ ├─ git-add-lane-guard.mjs                  │
│ ├─ main-tree-write-block.mjs               │ ◄── now ARMED
│ └─ worktree-commit-route.mjs               │
└────────────────────────────────────────────┘
```

## Units

| Unit | Artifact | Role |
|------|----------|------|
| U-SBB01 | `scripts/seed-slot-branch-bindings.mjs` | One-shot seeder for 25 work slots. Idempotent. |
| U-SBB02 | `scripts/backfill-chat-slots-branch.mjs` | Patches live `chat-slots.json` so arming is immediate, not next-heartbeat. |
| U-SBB03 | `.claude/helpers/chat-slots.mjs` (`inputForSlot` auto-seed) | Self-healing: every NEW chat auto-arms its slot on first claim. |
| U-SBB04 | `scripts/verify-slot-bridge-enforcement.mjs` | Pure-core e2e verifier. Exit-code suitable for CI gate. |

## Invariants

1. **Golf is integrator** — never seeded, never overwritten. The
   `INTEGRATOR_SLOT_NAME = "golf"` constant in `chat-slots.mjs` MUST
   stay aligned with `main-tree-write-block.mjs:108 INTEGRATOR_SLOT`.
2. **Fail-soft per R12** — auto-seed errors log to stderr but the claim
   still succeeds (degraded: hooks stay dormant for that slot until
   next claim attempt). Never crash on bindings-write failure.
3. **Idempotent** — every script re-runnable safely; seeder writes only
   missing entries, backfill writes only stale entries.
4. **Defense in depth** — golf-exempt asserted at both seeder + runtime
   auto-seed; bindings file existence asserted both with/without prior
   bindings file.

## Test surface

`__tests__/chat-slots-bindings.test.mjs` (22/22 PASS):

- Pre-existing U-WAVE5a coverage: 18 tests for
  `read/writeSlotBranchBindings`, `getSlotBranchBinding`, claimSlot
  binding override on empty-slot/refresh paths, heartbeat
  clobber-resistance.
- New U-SBB03 coverage:
  - `no binding auto-seeds for non-golf slot (U-SBB03 contract)`
  - `golf is EXEMPT from auto-seed (integrator invariant)`
  - `bindings file missing → auto-seeds on first non-golf claim`
  - `bindings file missing + golf claim → file NOT created`

End-to-end pure-core verifier
`scripts/verify-slot-bridge-enforcement.mjs` (3/3 PASS): bravo blocks
main-tree write, bravo allows own-worktree write, golf allows main-tree
write.

## Recovery / re-arm

```bash
node scripts/seed-slot-branch-bindings.mjs
node scripts/backfill-chat-slots-branch.mjs
node scripts/verify-slot-bridge-enforcement.mjs   # 3/3 PASS = healthy
```

After this, every NEW slot claim self-arms via U-SBB03 — no manual
re-seed ever needed again unless someone manually deletes the bindings
file.

## Why this couldn't have been caught earlier

U-WAVE5a tests asserted the override mechanism works *when a binding
exists*. They did NOT assert that bindings DO exist for the fleet —
that's a fleet-state property, not a function property. The audit gap
was at the operational layer (data-state), not the code layer.

This is exactly the failure mode named in
[[reference_slot_worktree_activation_2026_05_16]] (worktrees existed,
nobody used them) — code-shipped is not the same as code-armed. The fix
must cover both arming the present fleet AND making arming inevitable
for future chats (the U-SBB03 self-heal).

## Related

- [[slot-worktree-ms0]] — the worktree fleet that this bridge arms
- [[slot-worktree-enforcement-not-actually-active]] — the prior lesson
  that documented the symptom; this milestone closes the cause
- [[bug-findings-wiki-gate]] — wiki gate that surfaces missing wiki
  entries for bug-finding sessions; this entry satisfies it
- Memory: [[reference_slot_bridge_ms0_2026_05_26]]
