# SFC-VENDOR-PARITY/U-OSC-PROVEN-SFM-DIAGNOSTIC — [MAIN-FORCE] [SFC-VENDOR-PARITY]/U-OSC-PROVEN-SFM-DIAGNOSTIC (slot:oscar): make the proven-blend Vc decision a pure tested helper + flag SFM units mismatch

**Commit:** `c0bdb0e42310` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T02:18:55-05:00
**Tags:** sfc-vendor-parity, u-osc-proven-sfm-diagnostic, auto-distilled

## Subject
[MAIN-FORCE] [SFC-VENDOR-PARITY]/U-OSC-PROVEN-SFM-DIAGNOSTIC (slot:oscar): make the proven-blend Vc decision a pure tested helper + flag SFM units mismatch

## Body
```
[MAIN-FORCE] [SFC-VENDOR-PARITY]/U-OSC-PROVEN-SFM-DIAGNOSTIC (slot:oscar): make the proven-blend Vc decision a pure tested helper + flag SFM units mismatch

Extracts the proven-program Vc blend decision (KAR-MS2 U-KAR14) into a pure exported
classifyProvenVcDeviation(provenVc, physicsVc) -> {ratio, withinBlendBand, sfmUnitsArtifact}, so the blend
gate AND the units-mismatch diagnostic are unit-testable without seeding the aggregator singleton.

The blend band [0.7, 1.3] is PRESERVED exactly (zero number change). The only behavior change: when a
rejected proven Vc has a ratio in [2.8, 3.6] (~1/0.3048, the SFM-stored-as-m/min signature, Task #12) the
diagnostic NAMES it a likely units mismatch instead of a generic "differs" -- so the silent data-utility
waste (JM proven lathe css always rejected as an outlier) is VISIBLE until the store cssUnit is fixed at the
source. The 3.28x value was ALREADY rejected by the band, so this never affects a recommendation.

6 R9 tests (band inclusivity, SFM-artifact bracket [2.8,3.6] excludes 2x/4x, divide-by-zero/NaN guard). tsc clean.
Pre-existing (NOT this change, verified at pre-session 1f7d03f33d): calculator-machinist-allout-sanity
unclampedSteelVsToolSteel>500 counter fails -- logged in handoff.
```

## Files touched (3)
- mcp-server/src/__tests__/sfc-proven-vc-deviation.test.ts | 56 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedOrchestratorEngine.ts    | 42 +++++++++++++++++++++++++++++++++++-------
- 2 files changed, 91 insertions(+), 7 deletions(-)

## Lessons surfaced in commit body
- tility
- til the store cssUnit is fixed at the

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c0bdb0e42310`
- Milestone envelope: `mcp-server/data/milestones/SFC-VENDOR-PARITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._