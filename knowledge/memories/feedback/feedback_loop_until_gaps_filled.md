---
name: feedback_loop_until_gaps_filled
description: "R16 — never one-shot a build; run gap-closing loops until no logical gap remains, and reconcile against ALL existing built systems so the new work fits perfectly. Fleet-wide auto-enforced."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.433Z
aliases: feedback_loop_until_gaps_filled
---


**R16 — NEVER ONE-SHOT A BUILD; LOOP UNTIL GAPS CLOSED + FIT THE WHOLE (operator directive 2026-06-18, FLEET-WIDE, all slots + galaxies, auto-enforced).**

A first build pass ALWAYS leaves gaps — edge cases, error paths, conflicts, integration seams — that we historically discover downstream where they're expensive. Get them out of the way EARLY: after the first pass, run **multiple gap-closing loops** until no logical gap remains. And BEFORE declaring done, **assess + compare the new work against ALL systems already built** (not a sample) so it fits perfectly — no duplicate, no conflict, no orphan.

**Why:** "we never one-shot a build, we always end up finding gaps, errors, conflicts down the road." Surfacing them in-loop (cheap, in-context) beats discovering them in production (expensive, cross-session). And a build that doesn't reconcile against the existing ~600-engine / 100+-dispatcher / 110K-node system either duplicates, conflicts, or orphans. This is the per-build LOOP form of R13 (comprehensive route) + R15 (build-once-whole-everywhere): R13/R15 say build the thorough route; R16 says *iterate* it to gap-closure and *fit* it to the whole.

**How to apply:**
- **Loop, don't one-shot.** Pass 1 = core. Then loops: edge cases → error/failure paths → adversarial inputs → integration seams → conflict scan. Stop only when a loop finds nothing new (gap-dry), not when pass 1 "looks done."
- **Compare against ALL built systems before done:** `prism_session:master_index_query` (110K-node graph) + `duplicationGuardEngine` (THROWS on dup) + `/impact` (blast-radius) + `/dedup`. Confirm the new asset duplicates nothing, conflicts with nothing, orphans nowhere, and wires to every natural consumer.
- **Use /loop** (ATCS autonomous loop) for the iteration; eval-gate each loop (tests + per-file scrutiny per R15); the 3-of-3 Stop gate is the final gap check.
- Auto-enforced via the `comprehensive-build-enforce.mjs` UserPromptSubmit hook (BUILD scope item 6) — injects R16 on every build-intent prompt fleet-wide. Pairs with R13 [[feedback_build_comprehensive_route]] + R15 [[feedback_wire_test_validate_all_galaxies]] + the duplication guard + master-index search-first.

**Sibling (compose, don't duplicate):** [[feedback_always_fill_gaps]] = "fill a gap the moment you SEE one." R16 is the proactive complement: *loop to SURFACE* gaps before they bite + *compare against ALL built systems* so the result fits. Use both — R16 finds them in-loop, feedback_always_fill_gaps closes each one in-session.

A `[SCOPED]` operator opt-out is the only exception (a deliberate minimal one-shot fix).
