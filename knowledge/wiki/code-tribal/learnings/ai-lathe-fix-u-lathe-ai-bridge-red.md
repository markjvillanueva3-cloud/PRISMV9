# AI-LATHE-FIX/U-LATHE-AI-BRIDGE-RED — [MAIN-FORCE] [AI-LATHE-FIX]/U-LATHE-AI-BRIDGE-RED (slot:india): clear 3 RED in the Lathe AI-bridge pair -- incomplete material aliases (2) + a FP rounding-boundary test bug (1)

**Commit:** `4c7c558ede24` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T00:38:18-05:00
**Tags:** ai-lathe-fix, u-lathe-ai-bridge-red, auto-distilled

## Subject
[MAIN-FORCE] [AI-LATHE-FIX]/U-LATHE-AI-BRIDGE-RED (slot:india): clear 3 RED in the Lathe AI-bridge pair -- incomplete material aliases (2) + a FP rounding-boundary test bug (1)

## Body
```
[MAIN-FORCE] [AI-LATHE-FIX]/U-LATHE-AI-BRIDGE-RED (slot:india): clear 3 RED in the Lathe AI-bridge pair -- incomplete material aliases (2) + a FP rounding-boundary test bug (1)

LatheSpeedFeedDeepLearningAdvisorEngine.test.ts (2 fails) -- resolver incompleteness (R9: code was the wrong one):
  - "reduces confidence for difficult materials" + "resolves AISI alias to canonical material" failed because
    aluminum_6061 / inconel_718 / stainless_304 were NOT in AISI_ALIAS and are NOT canonical DB keys (canonical
    keys are "6061" / "Inconel 718" / "304"). resolveMaterial returned null -> success:false, confidence:0
    (advisor L588-600), so easy.confidence==hard.confidence==0 ("expected 0 to be less than 0") and
    resultSS304.success==false. These are common material names a robust resolver SHOULD handle.
  - Fix: add 5 ADDITIVE aliases to AISI_ALIAS (physics/constants.ts), all -> EXISTING canonical keys, matching the
    pre-existing sibling-pair convention (ss304/ss316, al6061/al7075): aluminum_6061->6061, aluminum_7075->7075,
    stainless_304->304, stainless_316->316, inconel_718->Inconel 718. NO physics numeric constant changed (pure
    name-resolution map), so no S(x) gate applies. Once resolved, the ISO-S -0.10 (advisor L638) correctly makes
    inconel (S) < aluminum (N). Both advisor tests now pass.

LatheSpeedFeedReasoningBridgeEngine.test.ts (1 fail) -- FP rounding-boundary test bug (R9: test was the wrong one):
  - "average of scenarios" did toBeCloseTo(avgConfidence, 2) (needs strict <0.005) against overall_confidence,
    which the engine rounds to 2dp (L656). At a .XX5 average, IEEE-754 makes 0.575*100 = 57.4999..., so
    Math.round -> 0.57 vs the unrounded 0.575 -> diff exactly 0.005 -> fail. Engine rounding is correct.
  - Fix: compare against the engine's 2dp convention -- expected = round(avg*100)/100, toBeCloseTo(expected, 10).
    EXACT match (stronger than the old +/-0.005 slop), not weakened.

Verify: lathe pair 65/65 (was 62/65); tsc clean (only pre-existing InventorCADCodeGeneratorEngine.ts:148 CAD
error). Alias change EMPIRICALLY exonerated of regression: the broader material-DB RED (~147 fails across
MaterialDatabaseEngine-U-AWR16 / u-arch3-material-resolution / wedm-5material-validation) is IDENTICAL with and
without my change (35 failed|58 passed both, via file-scoped HEAD checkout A/B) -- it is a SEPARATE pre-existing
unit (CANONICAL_MATERIAL_DB descriptive-key naming gap), queued for next iteration. My change touches only
AISI_ALIAS; CANONICAL_MATERIAL_DB is built independently (buildMaterialPhysics), so it provably + empirically
cannot affect those reads.
```

## Files touched (3)
- mcp-server/src/__tests__/LatheSpeedFeedReasoningBridgeEngine.test.ts | 7 ++++++-
- mcp-server/src/physics/constants.ts                                  | 5 +++++
- 2 files changed, 11 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- wrong one):
- wrong one):

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4c7c558ede24`
- Milestone envelope: `mcp-server/data/milestones/AI-LATHE-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._