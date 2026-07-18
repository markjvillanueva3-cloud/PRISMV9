# FEATURE-GAP-AUDIT-MS0/U-GAP-CAD-MESH-DECIMATION — add missing test (engine already ported)

**Commit:** `8ba06f50da59` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T18:55:39-05:00
**Tags:** feature-gap-audit-ms0, u-gap-cad-mesh-decimation, auto-distilled

## Subject
[FEATURE-GAP-AUDIT-MS0]/U-GAP-CAD-MESH-DECIMATION: add missing test (engine already ported)

## Body
```
[FEATURE-GAP-AUDIT-MS0]/U-GAP-CAD-MESH-DECIMATION: add missing test (engine already ported)

R8 dedup-preflight win. MeshDecimationEngine.ts is already a full port of
PRISM_MESH_DECIMATION_ENGINE.js (R2.3.1) — header confirms — but had NO
companion test, and the audit's 'digest=0, absent' claim was a digest
staleness false-positive (same META-tool schema-read-blindness class
as the 2026-05-17 high-roi-skill-rank regression).

Closes the test gap with 19/19 PASS:
  - Boundary: target>=original (no-op), target=0 (heap exhaust), target>>n
  - Invariants: reduction monotonicity, reductionRatio in [0,1], index validity,
    indices.length%3==0, vertex compaction
  - Geometry preservation: unit cube stays within bounded AABB, plane stays at z~0
  - Adversarial: empty mesh, 8x8 plane stress (128 tris), idempotent fixed point,
    NaN coordinates
  - Output shape: Float32Array/Uint32Array, accepts plain number[] inputs

Envelope: status not_started → completed with explicit rescope_note.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .../data/milestones/FEATURE-GAP-AUDIT-MS0.json     |  12 +-
- .../src/__tests__/MeshDecimationEngine.test.ts     | 277 +++++++++++++++++++++
- 2 files changed, 287 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8ba06f50da59`
- Milestone envelope: `mcp-server/data/milestones/FEATURE-GAP-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._