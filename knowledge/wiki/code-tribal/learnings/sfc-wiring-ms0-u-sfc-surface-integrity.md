# SFC-WIRING-MS0/U-SFC-SURFACE-INTEGRITY — [MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-SURFACE-INTEGRITY (slot:oscar): wire SurfaceIntegrityEngine into the SFC as an ADDITIVE surface_integrity output (gap #6)

**Commit:** `e6a23caf4ab7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T22:19:19-05:00
**Tags:** sfc-wiring-ms0, u-sfc-surface-integrity, auto-distilled

## Subject
[MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-SURFACE-INTEGRITY (slot:oscar): wire SurfaceIntegrityEngine into the SFC as an ADDITIVE surface_integrity output (gap #6)

## Body
```
[MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-SURFACE-INTEGRITY (slot:oscar): wire SurfaceIntegrityEngine into the SFC as an ADDITIVE surface_integrity output (gap #6)

The SFC exposed surface_FINISH (Ra) but no surface_INTEGRITY counterpart. Wired the standalone
SurfaceIntegrityEngine into UltimateSpeedFeedEngine as an ADDITIVE result.surface_integrity
sub-result -- residual stress (sign+MPa), white-layer thickness, affected-layer depth, hardness
change, fatigue derating, quality score -- consuming the resolved Vc/feed/ap and surfacing the
engine's white-layer / tensile-residual warnings into the SFC warnings array (oscar soul: never
publish without surfacing uncertainty).

- ADDITIVE/REPORT-ONLY: computed into a local, assigned to result.surface_integrity AFTER the
  result literal is fully built -> perturbs NO existing field (Vc/feed/force/clamp). Proof:
  gauntlet 206/206 + ultimate-speed-feed 76/76 unchanged (their exact Vc/feed/force asserts pass).
- Mapping (physics-reviewer verified): process turning->hard_turning@effectiveIso-H else turning,
  else milling; cutting_speed_m_min=Vc; feed_mm_rev=(isTurning||isDrilling?fn:fz_programmed*z)
  (= result.feed_per_rev); depth_of_cut_mm=ap; material by ISO (P/K/H->steel, M->stainless,
  N->aluminum, S->titanium if key matches titan/ti-/ti6 else nickel_alloy); coolant cryo/mql/
  dry+air_blast/flood. Guard Vc>0 && ap>0 (finite) -> degenerate input OMITS (no fake-zero).
- gap #6's ResidualStressPredictionEngine half DEFERRED (complex multi-method engine, no single
  entry point; separate unit) -- this ships the clean SurfaceIntegrity additive output.
- Tests ultimate-speed-feed-surface-integrity.test.ts (5): physically-valid bands (residual sign,
  quality 0-10, affected-depth), additive-intact, 4-ISO material span, ti-vs-nickel disambiguation,
  adversarial extreme-feed+cryo NaN-guard. 5/5 + 287 regression green; tsc clean for touched files.
- 2-arm scrutiny: physics-reviewer PASS + independent reviewer PASS. P2 (loose 'ti' substring)
  tightened to titan/ti-/ti6. NOTE pre-existing UNRELATED fail flagged: gauntlet-r2 cryo-Inconel
  thermal (the thermal path is coolant-insensitive; not gap #6; pre-existing/known).
```

## Files touched (3)
- mcp-server/src/__tests__/ultimate-speed-feed-surface-integrity.test.ts | 76 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/UltimateSpeedFeedEngine.ts                      | 49 +++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 125 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e6a23caf4ab7`
- Milestone envelope: `mcp-server/data/milestones/SFC-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._