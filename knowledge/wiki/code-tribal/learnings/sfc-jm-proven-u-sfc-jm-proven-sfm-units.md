# SFC-JM-PROVEN/U-SFC-JM-PROVEN-SFM-UNITS — [MAIN-FORCE] [SFC-JM-PROVEN]/U-SFC-JM-PROVEN-SFM-UNITS (slot:oscar): JM proven CSS is SFM not m/min -- units fix INVERTS the divergence verdict

**Commit:** `e0fdd23c5513` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T23:01:03-05:00
**Tags:** sfc-jm-proven, u-sfc-jm-proven-sfm-units, auto-distilled

## Subject
[MAIN-FORCE] [SFC-JM-PROVEN]/U-SFC-JM-PROVEN-SFM-UNITS (slot:oscar): JM proven CSS is SFM not m/min -- units fix INVERTS the divergence verdict

## Body
```
[MAIN-FORCE] [SFC-JM-PROVEN]/U-SFC-JM-PROVEN-SFM-UNITS (slot:oscar): JM proven CSS is SFM not m/min -- units fix INVERTS the divergence verdict

Chasing the iter-11 suspect-units rows back to the source uncovered a systematic UNITS bug:
the JM proven-store css is in SFM (Okuma inch-mode G96), but iter-11 compared it to
CANONICAL_TURNING_SPEEDS (m/min) as if it were already metric. Evidence it is SFM: OkumaOSPParserEngine
field is documented "(SFM)" + the aggregator copies it RAW (no conversion); max G96 S = 3000
(= 914 m/min as SFM, IMPOSSIBLE as m/min turning); 0 of 16,558 programs use G21 (metric); JM is a
US/inch shop. physics-reviewer confirmed at the source + by physical impossibility.

FIX: SFM_TO_M_PER_MIN=0.3048 (exact ft->m, a unit conversion NOT a physics constant) + cssToMPerMin();
buildDivergenceRows converts css SFM->m/min before the band compare (default --css-unit sfm, JM corpus;
override m_min). Rows carry raw sfm + converted m/min.

THE FLIP (this is why it matters): treating SFM as m/min, iter-11 falsely reported AGGRESSIVE 10/3.
Converted, ALL 14 comparable configs are CONSERVATIVE (61-213 m/min vs the 220-320 P carbide band) --
JM amateurs run slow legacy-SFM speeds, the operator's premise. carbon_steel 700 SFM -> 213 m/min ->
-3% (the physics-reviewer's exact prior prediction). The units bug had INVERTED the conclusion.

12/12 tests (cssToMPerMin exact-value + sfm-conversion + null-safe). Per-file 2-arm PASS (physics +
code). CRITICAL SOURCE FOLLOW-UP (queued, higher severity): the aggregator stores SFM as unlabeled
css -> if the orchestrator proven-blend is enabled it recommends 3.28x too FAST (the dangerous
direction). Fix at ProvenSpeedFeedAggregatorEngine/OkumaOSPParserEngine (label/convert units) + re-extract.
```

## Files touched (3)
- mcp-server/scripts/sfc-jm-proven-divergence.mjs      | 59 +++++++++++++++++++++++++++++++++++++++++------------------
- mcp-server/scripts/sfc-jm-proven-divergence.test.mjs | 34 ++++++++++++++++++++++++++++++----
- 2 files changed, 71 insertions(+), 22 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e0fdd23c5513`
- Milestone envelope: `mcp-server/data/milestones/SFC-JM-PROVEN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._