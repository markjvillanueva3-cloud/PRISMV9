# FEATURE-GAP-AUDIT-MS0/U-GAP-CAD-CURVATURE-OFFSET — add tests (engines already ported)

**Commit:** `7da34411ea05` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T19:07:02-05:00
**Tags:** feature-gap-audit-ms0, u-gap-cad-curvature-offset, auto-distilled

## Subject
[FEATURE-GAP-AUDIT-MS0]/U-GAP-CAD-CURVATURE-OFFSET: add tests (engines already ported)

## Body
```
[FEATURE-GAP-AUDIT-MS0]/U-GAP-CAD-CURVATURE-OFFSET: add tests (engines already ported)

R8 dedup-preflight win. Both engines already ported in prior sessions:
  - CurvatureAnalysisEngine.ts (Meyer-Desbrun-Schröder-Barr 2003)
  - OffsetSurfaceEngine.ts (Maekawa 1999)
but had NO companion tests. Closes that gap with 18/18 PASS:
  - Planar grid invariants: K ≈ 0, H ≈ 0 at interior vertices
  - Output array length == vertex count
  - Principal max ≥ min, curvedness ≥ 0, shape index in [-1, 1]
  - Discriminant clamp: principalMax/Min stay finite even when H² < K
    (well-known discrete-mesh failure mode at vertices with large angle defect)
  - Offset planar mesh: +d shifts every z by +d; -d by -d; 0 = identity
  - smooth-normals + face-normals both produce valid offsets
  - createShell: outer at +t/2, inner at -t/2; indices.length%3==0
  - Adversarial: empty mesh, 100-unit offset

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .../data/milestones/FEATURE-GAP-AUDIT-MS0.json     |  14 +-
- .../src/__tests__/CurvatureOffsetEngines.test.ts   | 265 +++++++++++++++++++++
- 2 files changed, 277 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7da34411ea05`
- Milestone envelope: `mcp-server/data/milestones/FEATURE-GAP-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._