# MACHINING-TRIBAL-COVERAGE/U-MTC06 — [MAIN] [MACHINING-TRIBAL-COVERAGE]/U-MTC06: tooling-selection canonical — substrate, flutes, helix, coating, L:D, by-material defaults (14.7% audit category, was 5th-weakest)

**Commit:** `fe469d46cb43` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T15:02:02-05:00
**Tags:** machining-tribal-coverage, u-mtc06, auto-distilled

## Subject
[MAIN] [MACHINING-TRIBAL-COVERAGE]/U-MTC06: tooling-selection canonical — substrate, flutes, helix, coating, L:D, by-material defaults (14.7% audit category, was 5th-weakest)

## Body
```
[MAIN] [MACHINING-TRIBAL-COVERAGE]/U-MTC06: tooling-selection canonical — substrate, flutes, helix, coating, L:D, by-material defaults (14.7% audit category, was 5th-weakest)

Hand-authored canonical entry continuing the U-MTC02..05 thread. Closes the
5th-weakest tribal coverage category surfaced by audit-tribal-coverage.mjs
(8727 tips scanned; tooling-selection at 14.7%, next after machining-tactics
at 8.0%).

9 sections + provenance + cross-refs to the prior 4 canonicals:
1. Substrate (HSS, cobalt, solid carbide, indexable, PCD, CBN) — when each wins
2. Flute count (2-9FL) — matched to material + cut type
3. Helix angle (0-60°) — finish, force-direction, axial-pull math, variable-helix
4. Coating (TiN, TiCN, TiAlN, AlTiN, AlCrN, DLC, CrN, nACo) — temp + where each dies
5. L:D ratio — Euler-Bernoulli deflection law, holder hierarchy, shrink-fit threshold
6. Drills / taps / reamers — fast-pick lookup tables
7. Insert selection for turning — ISO shape codes + grade letters + chipbreaker geometry
8. Failure modes — 8 sound/look diagnostics
9. Shop-floor 5-line check before pulling from the crib

Pickup: tribal-by-domain-inject.mjs + wiki-precheck-inject.mjs (no wiring required).
Lifecycle: Current. Re-validate against shop-floor outcome ledger every 90 days.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- .../tooling-selection-geometry-coating-stickout.md | 196 +++++++++++++++++++++
- 1 file changed, 196 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fe469d46cb43`
- Milestone envelope: `mcp-server/data/milestones/MACHINING-TRIBAL-COVERAGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._