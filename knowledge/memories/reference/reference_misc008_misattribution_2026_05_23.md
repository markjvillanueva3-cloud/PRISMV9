---
name: misc008-misattribution-2026-05-23
description: "2026-05-23 mike /loop iter2 — MISC-008 close-out (BusinessStore.cache-regression.test.ts, 5/5 tests pass) absorbed into hotel commit 73ba020f2c ([HOTEL]/U-PAYROLL-WIRE iter4) by shared-tree git-add race. Second mike-loss this session (sister to U-BRIDGE-WIRE-AGENT → delta absorption). Deliverable real, attribution wrong."
aliases: reference_misc008_misattribution_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.660Z
---


# MISC-008 misattribution (mike → hotel) — 2026-05-23

## What shipped (real deliverable)

`mcp-server/src/__tests__/BusinessStore.cache-regression.test.ts` (NEW, 82 LOC, 5/5 PASS) — regression lock for `MISC-TASKS-INVENTORY.MISC-008` ("Fix getStore() data-loss bug — cache store instances so flush does not create empty InMemory store losing data, P0").

Coverage:
1. Reference-equality of cached `getStore("X") === getStore("X")` (the ONLY assertion that catches the original bug; deep-equal would pass for two empty stores).
2. Distinct entities return distinct instances (no cache-key collision).
3. `save()` through one handle visible via `findById()` through second `getStore()` call (functional consequence of the cache).
4. `resetStoreCache()` truly clears the cache (post-reset is a fresh instance).
5. Unknown entity throws (no silent fallback masking config drift).

Key finding before the test was written: the MISC-008 inventory entry is STALE — the fix already shipped at `db/BusinessStore.ts:786-812` ("P0-1: instance cache — same entity always returns same store instance"). Same false-positive class as [[reference_u_orphan_rescue_stripe_2026_05_20]] (Stripe-billing "orphan" turned out to be route-layer-wired). Mike's value-add was the missing regression-lock test — without it, a future refactor removing the cache would silently re-introduce the data-loss bug and the type-checker would still pass.

## What went wrong (attribution)

The test file landed in commit **`73ba020f2c` by slot:hotel** (`[HOTEL]/U-PAYROLL-WIRE (slot:hotel iter4): PayrollEngine.test.ts — 15 cases, ...`). Hotel's `git add -A` (or equivalent broad-add) on their PayrollEngine work swept mike's test file along with their own.

This is the **second** mike-loss this session — see also [[reference_u_bridge_wire_agent_misattribution_2026_05_23]] for the U-BRIDGE-WIRE-AGENT → delta `1c231d6f36` absorption that happened in the same /loop earlier (iter 1).

## Race-mitigation attempt that didn't work

Per [[reference_india_iter4_hpm_wire_2026_05_23]], the working mitigation is an atomic single-bash `git add && git commit` chain inside a 30-iter lock-poll loop. I applied that pattern. It still failed because:

1. The lock was held for >30s by a peer commit (`device or resource busy` even on direct `rm`).
2. By the time the lock cleared, hotel's `git add -A` had already absorbed my file.
3. The auto-unstage hook then *correctly* reported "every staged file (1) belonged to other sessions; auto-unstaged" — because by then, my file was no longer "mine" per the slot-claim attribution map.

Conclusion: the lock-poll race-mitigation pattern works against quick peer commits but fails against slow peer commits that hold the lock for ≥10s. For these, the only reliable fix is the slot-worktree cutover (`H:/prism-slot-mike` on `slot/mike`), which removes the shared `.git/index` contention entirely.

## Verification (the work is real and in HEAD)

```bash
git log -1 --format="%h %s" -- mcp-server/src/__tests__/BusinessStore.cache-regression.test.ts
# → 73ba020f2c [MAIN] [HOTEL]/U-PAYROLL-WIRE (slot:hotel iter4): PayrollEngine.test.ts — 15 cases, ...

ls mcp-server/src/__tests__/BusinessStore.cache-regression.test.ts   # → exists, 3.6K

cd mcp-server && npx vitest run src/__tests__/BusinessStore.cache-regression.test.ts
# → Test Files  1 passed (1)  ;  Tests  5 passed (5)
```

## Why apply

When close-out audits credit commit `73ba020f2c` to slot:hotel as "PAYROLL-WIRE work", the embedded MISC-008 regression-test work will look like part of payroll work — it isn't. The instance-cache regression lock is a `MISC-CLOSEOUT` unit owned by **slot:mike**. Cross-reference this memo before attributing.

## How to apply

- **Close-out scripts** that credit work by commit author MUST cross-reference this memo (and the U-BRIDGE-WIRE-AGENT sister memo) before crediting these two artifacts to hotel/delta.
- **Do not re-do the work, do not revert.** Both deliverables are in HEAD and will protect the codebase regardless of attribution.
- **Going forward**: slot:mike should migrate to the slot-worktree (`H:/prism-slot-mike` on `slot/mike`) to escape the shared-tree race entirely. The lock-poll mitigation is insufficient under high fleet activity (8+ peers, 100+ active /loop sessions seen today).

## Loop summary

- Session: `b99caaae-4bcd-4466-b672-c6b515cd6093`, mike /loop, iter 2/20
- Goal: "complete remaining mike-slot units, wired to viable nodes" /loop 5m /goal
- Iter 1 shipped: U-BRIDGE-WIRE-AGENT (3 unwired engines + 8 tests) → absorbed by delta `1c231d6f36`
- Iter 2 shipped: MISC-008 (5-test regression lock) → absorbed by hotel `73ba020f2c`
- Total real deliverable in HEAD: **3 new dispatcher actions + 13 passing tests + 2 misattribution memos**
- Attribution: 0/2 correctly credited (both swept by peer git-add races)
