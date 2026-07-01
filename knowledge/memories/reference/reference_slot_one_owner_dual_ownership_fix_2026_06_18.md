---
name: reference_slot_one_owner_dual_ownership_fix_2026_06_18
description: "claimSlot left a dangling slot when a chat owned two (lingering /startup-papa + /checkin-alpha) -- the 'keep logging back into papa' bug. Fix: one-chat-one-slot reconciliation releases ALL of a chat's other slots on every claim."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.207Z
aliases: reference_slot_one_owner_dual_ownership_fix_2026_06_18
---


# Slot dual-ownership leak -- the "keep logging back into papa" bug (2026-06-18, slot:alpha)

**Operator symptom (reported twice):** "fix whatever is forcing you to keep logging back into papa" -- this (alpha) terminal kept presenting as **papa** after a prior `/startup-papa` session, even though `/checkin-alpha` ran.

## Root cause (VERIFIED by reading the code, not assumed)
`.claude/helpers/chat-slots.mjs::claimSlot` reconciled only the **FIRST** slot a chat owned, then returned/broke (old loop ~lines 921-947). It assumed one-chat-one-slot but never **enforced** it. So when a chat transiently owned **two** slots -- a lingering `papa` claim from `/startup-papa` PLUS `alpha` from this terminal -- `/checkin-alpha` (preferSlot=alpha) hit the `wantsDifferentSlot(alpha)=false` branch, refreshed alpha, and **returned, leaving papa dangling forever**. The stale `papa` record was then resolved by the per-prompt context injectors (`slot-soul-inject`, `galaxy-claudemd-inject`, `slot-domain-awareness-inject`, `slot-context-bundle-inject`) and fleet tooling -> the chat looked like papa, while `slot-bind-enforce` authoritatively said alpha. Two resolvers, two answers.

Secondary (now MOOT): `slot-context-bundle.resolveSlot` matched via loose `sessionId.startsWith(short)` over **JSON insertion order**, diverging from the canonical `findSlotForChat` (exact chatId over SLOT_NAMES order). Once one-chat-one-slot holds, only ONE slot ever matches, so the divergence can't bite; and `startsWith` over fixed 8-hex ids is effectively exact. Not fixed (no longer reachable).

## Fix (U-SLOT-ONE-OWNER, this commit on cad-fusion-live-ms0)
`claimSlot` now collects **every** slot `input.chatId` owns and settles on exactly one, releasing the rest:
- operator force-move to a slot the chat does NOT own -> release ALL owned, fall through to claim the new one;
- else keep preferSlot (if owned) or the **newest-heartbeat** owned slot (deterministic dedupe), release the others.
Behavior is **byte-identical** in the normal single-owned case (the 3 prior branches preserved); only the >=2-owned case changes from "leak the extras" to "reconcile to one". `claimSlot` is the SOLE writer of slot records (grep-verified: no bypass writer outside chat-slots.mjs), so this is the chokepoint that guarantees the invariant fleet-wide.

## Proof
- `chat-slots-one-owner.test.mjs` 6/6 (T1 the bug: dual alpha+papa -> /checkin-alpha leaves ONLY alpha; T2 force-move-to-third releases both; T3 plain re-claim dedupes to newest; T4 findSlotForChat agrees; T5 single-owned regression unchanged; T6 triple-owned). Failing-first confirmed (4 fail pre-fix).
- Regression: `chat-slots-force-fix.test.mjs` 6/6, `chat-slots-pid-gate` 20/20, `chat-slots-release-no-orphan` 2/2.
- Live-data validation: injected the exact bug (claude-14b038a1 owns alpha+papa) into a copy of the REAL chat-slots.json -> `claimSlot(preferSlot=alpha,force)` reconciled to ONLY alpha (papa released). Live file never touched (verified intact).
- Per-file 2-arm scrutiny PASS (0 P0/P1).

## Lesson
An "owns at most one X" assumption must be **enforced at the single mutation chokepoint**, not assumed by callers -- a first-match-then-return reconciliation silently leaks the extras the moment the invariant is violated once. Pairs with the prior-session [[reference_pspin_findps_args_fix_2026_06_18]] window-tier work (that fixed WHICH handoff to read; this fixes the slot CLAIM reconciliation -- together `/checkin-alpha` now sticks).

Related: [[reference_pspin_findps_args_fix_2026_06_18]] · [[reference_alpha_autoloop_unwired_triage_2026_06_18]] · [[feedback_verify_actual_contract_not_proxy]]
