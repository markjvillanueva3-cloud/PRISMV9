---
name: reference_classify_verify_wiring_precedence_disproven_2026_06_19
description: "audit-mcp-route-takerate classify() routes every 0-take classifier (fires>=50) to verify-wiring, never suppress -> the decay actor never decays the dominant net-cost route-nudges. The new evaluations denominator disproves the 'measurement artifact' premise (evaluations>0 = genuine net-cost). Flipping to suppress is a CROSSROADS (token-efficiency vs graph-utilization) = operator decision."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.518Z
aliases: reference_classify_verify_wiring_precedence_disproven_2026_06_19
---


# classify() verify-wiring precedence is now partly disproven (2026-06-19, slot:alpha)

Surfaced completing the take-rate honesty thread (after U-TAKEUP-EVAL-DENOMINATOR `5752cc01af` + U-ROUTE-SAVINGS-HEADLINE-HONEST `39b83fd04c`).

## The finding (verified from code)
- `classify()` (`scripts/audit-mcp-route-takerate.mjs:62`) has a hard precedence: `if (fires >= 50 && takes === 0) return "verify-wiring"`. So EVERY 0-take classifier with >=50 fires returns `verify-wiring`, NEVER `suppress`. Doctrine at the time: "Do NOT suppress on a 0% take-rate that's a measurement artifact."
- The decay actor `scripts/lib/route-suggest-decay.mjs` (`isRouteSuggestDecaySuppressed`, wired into `mcp-route-suggest.mjs:18`/`:827`) acts ONLY on the `suppress` verdict.
- Net effect: the dominant net-cost route-nudges (live: `isVerboseBash` 368 fires, `isLargeRead`, `doctrineSurface` 71, `backendAuditChain` 42 -- all 0 in-window takes, injected on every tool call) are NEVER decayed. No `route-suggest-decay-state.json` exists -> nothing has ever been suppressed.

## Why the precedence is now partly wrong
The `evaluations` denominator (U-TAKEUP-EVAL-DENOMINATOR) DISTINGUISHES a measurement artifact (`evaluations===0`, cause unproven) from a GENUINE 0-take-rate (`evaluations>0`, credit path proven live, fleet just isn't routing in-window). The `verify-wiring` precedence assumes "0 takes = probably a measurement gap" -- which is now provably FALSE when evaluations>0. Those classifiers are proven net-cost, not unmeasured.

## Why it is NOT an autonomous unit -- it is a CROSSROADS (R7)
Flipping `classify()` to return `suppress` for `takes===0 && fires>=50 && evaluations>0 && share>=0.30` would make the decay actor START decaying the dominant nudges -> real token savings. BUT those nudges are the operator's standing "maximize the graph each slot uses before any task" push. So it pits two operator goals against each other (token-efficiency vs graph-utilization) with fleet-wide, behavior-changing consequences. Per the DECISION-CROSSROADS doctrine + R7 (surface conflicts, don't average), this is an operator decision, not a unilateral build.

## RESOLVED (2026-06-19): operator chose Option A (hybrid/advisory) -- SHIPPED
Commits `1e9c4a1ee2` (U-CLASSIFY-SUPPRESS-CANDIDATE) + `8faf5eea5d` (HARDEN). `classify()` now grades a dominant (share>=30%) 0-take classifier `suppress-candidate` when fleet `evaluations>0`; the decay actor matches `recommendation==="suppress"` EXACTLY + requires `takes>0`, so it IGNORES `suppress-candidate` -- all nudges keep firing (graph push intact), the dashboard just flags the proven-net-cost classifier. Live: `isVerboseBash` (374 fires, 55% share, 0 takes) -> `suppress-candidate`. Backward-compatible (evaluations defaults 0 -> verify-wiring). audit 25/25 + decay 17/17; per-file 2-arm + 3-of-3 PASS. The strict-eq invariant is now documented at the decay match site (route-suggest-decay.mjs) so a future `.startsWith`/`.includes` can't silently mute nudges.

## Options that were put to the operator (A chosen)
- **A (decay):** make `classify()` evaluations-aware -> `suppress` the proven-net-cost dominant 0-take classifiers; the decay actor fades them. Saves tokens; fewer graph-utilization nudges.
- **B (keep):** leave all nudges firing for the graph-utilization push; accept the net-cost (the nudges fire every tool call at ~0 realized savings).
- **C (hybrid):** add an advisory `suppress-candidate` verdict (does NOT auto-decay) so the dashboard flags the proven-net-cost classifiers for an operator to decay manually/selectively. Lowest-risk; preserves the push by default.

Related: [[reference_takeup_eval_denominator_fabricated_signal_2026_06_19]] · the route-suggest-decay actor [[reference_route_decay_splice_wired_2026_06_12]] · doctrine [[feedback_crossroad_brainstorm_workflow]].
