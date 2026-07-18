# WIRE-UNWIRED-MS0/U-WIRE-TTW — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-TTW: wire TurningToolpathWearEngine into prism_turning (1 action)

**Commit:** `246689707955` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T16:12:12-05:00
**Tags:** wire-unwired-ms0, u-wire-ttw, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-TTW: wire TurningToolpathWearEngine into prism_turning (1 action)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-TTW: wire TurningToolpathWearEngine into prism_turning (1 action)

Wires TurningToolpathWearEngine (LATHE-PRO-MS1/U-LPR12, 269 LOC) into
prism_turning. One new action:

  - turning_toolpath_wear → accumulateWear(input): ToolpathWearResult

Distinct from TurningWearPredictionEngine (per-op Usui): this one
integrates wear along TOOLPATH SEGMENTS with variable Vc due to CSS
modulation, interrupted-cut shock loading, and ap/nose_radius engagement
geometry. Engine was orphan in dispatcher graph since LPR12 ship (zero
dispatcher refs across all 97 dispatchers).

Confirmed during pre-wire vetting: prior session's Agent A had flagged
this as an "internal sub-engine of TurningWearPredictionEngine" — that
classification is WRONG. The engines share import boundaries (both pull
from CANONICAL_TAYLOR + turningInsertLifeEngine) but their public APIs
are completely separate (per-op accumulator vs per-segment integrator)
and serve different caller intents (job-level cost analysis vs CAM-level
toolpath-aware life prediction).

Physics surface (preserved exactly from engine):
  - VB_max = 300µm flank-wear limit (ISO 3685:1993)
  - INTERRUPTED_SHOCK_BASE = 1.5× max multiplier
  - ENGAGEMENT_EXPONENT = 0.15 ((ap/nose_radius)^0.15)
  - CSS-mode: actualRPM = min(needed_rpm, max_rpm) → avg_vc clamped
  - VB linear model: VB = VB_max · life_fraction

4-surface coverage:
  ✓ schema   — 1 Zod schema + _toolpathSegment helper enum
  ✓ dispatcher — 1 ACTIONS enum entry + lazy-import case
  ✓ engine-direct test — turning-toolpath-wear.test.ts (pre-existing)
  ✓ dispatcher round-trip — 16 new cases:
        1 schema registration
        7 schema rejection (unknown iso, empty segments, zero Vc,
                             zero nose_radius, unknown op_type, negative
                             ap, minimal accept)
        7 round-trip:
            - baseline 2-segment per-segment + cumulative wear
            - cumulative_wear_um equals running sum
            - CSS-mode clamp: big d=100 → ~200 m/min,
                              small d=20 → ~π·20·2000/1000 ≈ 125.66 m/min
            - interrupted vs continuous → interrupted life_fraction larger
            - exceeds_vb_max true on 200-pass superalloy roughing
            - hotspot_segment names highest-wear segment ("heavy")
            - parts_per_edge finite + positive for sub-life path
        1 dispatcher-boundary rejection
  Total: 16/16 vitest green.

Tsc baseline: zero new errors on touched files.

References:
  Usui, Shirakashi & Kitagawa (1978), "Analytical Prediction of Tool Wear"
  Altintas, "Manufacturing Automation," §4.5 — wear models
  ISO 3685:1993 — Tool wear measurement
  Sandvik "CSS and tool life" application note

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../dispatcher.turningToolpathWear.test.ts         | 293 +++++++++++++++++++++
- mcp-server/src/schemas/turningActionSchemas.ts     |  46 ++++
- .../src/tools/dispatchers/turningDispatcher.ts     |  19 ++
- 3 files changed, 358 insertions(+)

## Lessons surfaced in commit body
- WRONG. The engines share import boundaries (both pull

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 246689707955`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._