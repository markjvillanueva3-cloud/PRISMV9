# SFC-CONVERGENCE/U-SFC-AUTOPILOT-MATERIAL-CANONICAL — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-AUTOPILOT-MATERIAL-CANONICAL (slot:oscar): align autopilot material resolution to canonical constants + fail-loud unknown fallback

**Commit:** `efb0c97358f5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T00:05:50-05:00
**Tags:** sfc-convergence, u-sfc-autopilot-material-canonical, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-AUTOPILOT-MATERIAL-CANONICAL (slot:oscar): align autopilot material resolution to canonical constants + fail-loud unknown fallback

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-AUTOPILOT-MATERIAL-CANONICAL (slot:oscar): align autopilot material resolution to canonical constants + fail-loud unknown fallback

SpeedFeedAutopilotEngine.resolveMaterial had two material-resolution bugs that
diverged from the canonical physics/constants.ts (2 RED tests):

1. generic "steel" alias mapped to "1018" (kc1.1=1700, MILD steel) instead of
   the P-group canonical representative "1045" (kc1.1=1800, medium carbon).
   constants.ts AISI_ALIAS already maps "steel"->"1045"; the engine local map
   had diverged. SAFE direction: force +5.9% (1700->1800), more conservative.

2. a terminal `|| "steel"` fallback on the canonical-grade-key find() silently
   resolved truly-unrecognized material names to a CONFIDENT (0.85) steel pick
   -- an R12 fail-loud violation. Removed it so an unknown name falls through to
   default_fallback (confidence 0.3 + source "default_fallback"), which run()
   surfaces as a low-confidence operator warning. Object.keys enumerates only
   the 15 canonical grade keys (descriptive AISI_ALIAS names are
   non-enumerable), so the find() cannot re-introduce the confident steel pick.

3. default_fallback now reports resolved_iso "P" and pulls kc1_1/mc/taylor/
   density/k_thermal from CANONICAL_MATERIAL_DB["1045"] instead of inlining the
   literals (1800/0.25/350/0.25/7850/50) -- de-inlined + self-consistent (the
   fallback already uses P-canonical kc/mc; magnitude unchanged for unknowns).

dbKey widened to string|undefined (find() may now legitimately miss).

Verify: SpeedFeedAutopilotEngine.test.ts 28/28 + speed-feed-autopilot-wire.test.ts
15/15 (was 2 RED: steel kc 1800, unknown->default_fallback). tsc clean.
physics-reviewer PASS (6/6 constants canonical, no inlined). safety-physics PASS
S(x)=1.00 (no under-prediction on any path).
```

## Files touched (2)
- mcp-server/src/engines/SpeedFeedAutopilotEngine.ts | 35 +++++++++++++++++++++++++++--------
- 1 file changed, 27 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show efb0c97358f5`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._