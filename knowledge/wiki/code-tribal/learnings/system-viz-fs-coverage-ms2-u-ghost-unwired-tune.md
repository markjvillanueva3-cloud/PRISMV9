# SYSTEM-VIZ-FS-COVERAGE-MS2/U-GHOST-UNWIRED-TUNE — expand inference rules — UNKNOWN tail 456 → 331 (+126 confident wires)

**Commit:** `9ef5f995d9f2` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T20:04:17-05:00
**Tags:** system-viz-fs-coverage-ms2, u-ghost-unwired-tune, auto-distilled

## Subject
[SYSTEM-VIZ-FS-COVERAGE-MS2]/U-GHOST-UNWIRED-TUNE: expand inference rules — UNKNOWN tail 456 → 331 (+126 confident wires)

## Body
```
[SYSTEM-VIZ-FS-COVERAGE-MS2]/U-GHOST-UNWIRED-TUNE: expand inference rules — UNKNOWN tail 456 → 331 (+126 confident wires)

Added 17 new dispatcher inference patterns surfaced from sampling the 456 UNKNOWN tail:
  prism_intelligence: abstract/hierarchy/synergy/authority/attractor/cognitive
  prism_orchestrate: agent/workflow/autopilot/pipeline/executor/worker/broker/scheduler
  prism_dev: schema/cache/atomic/registry/config/backup/migration/lifecycle
  prism_session: asset/acquisition/recommendation/auth/authoriz/jwt/oauth
  prism_safety: as9100/iso-9001/traceab/reliab/validator/guard/compliance
  prism_cam: autocad/catia/plugin/addin/bridge + arc/fillet/mesh + pump/piston/ball-mill + post-proc + endmill catch-all
  prism_cad: arc/fillet/chamfer/mesh/geom/nurbs/spline/bezier
  prism_intake: extractor/parser/tokeniz/ingest/harvester
  prism_ai: predictor/classifier/recommender/regressor/estimator

Confidence breakdown after re-apply:
  high (≥0.80):    149 → 169  (+20)
  medium (≥0.60):  156 → 289  (+133)
  low (≥0.50):      11 →  22  (+11)
  none (UNKNOWN):  494 → 331  (-163)

Graph state delta:
  nodes: 373,634 → 373,635 (+1 churn)
  edges: 591,921 → 592,047 (+126 new ghost-wire edges)
  proposed-wire coverage: 354/810 (44%) → 480/811 (59%)

Tests: 23/23 PASS (fixture for UNKNOWN test changed XyzzyFooBar since RandomNoiseGenerator now hits the new 'generator' rule).

Comprehensive-build no-defer: closes the inference gap surfaced from the prior commit's UNKNOWN punch list.
```

## Files touched (3)
- scripts/seed-ghost-from-unwired.mjs      | 19 +++++++++++++++++++
- scripts/seed-ghost-from-unwired.test.mjs |  4 +++-
- 2 files changed, 22 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9ef5f995d9f2`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-FS-COVERAGE-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._