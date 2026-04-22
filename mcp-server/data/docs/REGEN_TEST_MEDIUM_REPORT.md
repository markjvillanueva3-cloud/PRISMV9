# CAD Regeneration Test Report — Medium Complexity Parts (U-CADC24)

**Date:** 2026-04-22
**Harness Version:** 1.0.0
**Test Type:** Medium Complexity Parts (JM Die Production Parts)

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Tests | 100 |
| Passed | 67 |
| Failed | 28 |
| Errors | 5 |
| **Pass Rate** | **67%** ✗ |
| Target | **100%** |

**Status: ⛔ FAIL** — 100% pass rate REQUIRED for safety-critical machining code.

> **SAFETY NOTICE:** These are REAL JM Die production parts — casings, dies, punches.
> They go into stamping presses making parts for ITW, Alcoa, Optimas, SFS, Holo-Krome.
> Those parts end up in aircraft, medical devices, automotive safety systems.
> A bug can cause crashes, injuries, or death. NO TOLERANCE FOR FAILURES.

## Configuration

```json
{
  "thresholds": {
    "volumeDeltaPercent": 5,
    "bboxDeltaPercent": 2,
    "topologySimilarityMin": 0.8,
    "featureCountDeltaPercent": 20
  },
  "partTypes": ["casing", "die", "punch", "stripper", "bushing", "pilot"],
  "source": "JM Die Production Archive",
  "sampleSize": 100
}
```

## Results by Part Type

| Part Type | Count | Passed | Failed | Pass Rate |
|-----------|-------|--------|--------|-----------|
| Casing | 22 | 18 | 4 | 82% |
| Die | 25 | 14 | 11 | 56% |
| Punch | 20 | 12 | 8 | 60% |
| Stripper | 15 | 11 | 4 | 73% |
| Bushing | 10 | 8 | 2 | 80% |
| Pilot | 8 | 4 | 4 | 50% |

## Results by Metric

| Metric | Passed | Failed | Pass Rate |
|--------|--------|--------|-----------|
| Volume | 78 | 22 | 78% |
| Bounding Box | 85 | 15 | 85% |
| Topology | 72 | 28 | 72% |
| Feature Count | 80 | 20 | 80% |

## Failure Analysis — Die Parts (11 failures)

### Pattern: Complex Cavity Recognition

| File | Issue | Root Cause |
|------|-------|------------|
| die_progressive_001.step | Topology 0.45 | Multi-station cavities merged |
| die_compound_003.step | Volume +18% | Slug pocket depth wrong |
| die_transfer_007.step | Features 8→3 | Pilot holes not detected |
| die_blanking_012.step | Topology 0.52 | Shear angle features lost |
| die_forming_015.step | Volume +12% | Draw radius underestimated |
| die_pierce_018.step | BBox Z +8% | Through-hole depth wrong |
| die_trim_022.step | Features 12→6 | Trim edge profile simplified |
| die_cam_025.step | Topology 0.38 | Cam action geometry lost |
| die_progressive_028.step | Volume +15% | Station spacing error |
| die_coining_030.step | Features 9→4 | Coining detail lost |
| die_notching_033.step | Topology 0.48 | Notch sequence lost |

**Root Cause Summary:** Die parts have complex cavity geometries with multiple interacting features. Current feature recognition treats multi-station progressive dies as single cavities.

### Pattern: Punch Profile Issues (8 failures)

| File | Issue | Root Cause |
|------|-------|------------|
| punch_pierce_001.step | Volume -8% | Point geometry over-simplified |
| punch_form_004.step | Topology 0.55 | Form profile lost |
| punch_pilot_007.step | BBox -5% | Shoulder diameter wrong |
| punch_notch_010.step | Features 4→2 | Notch detail merged |
| punch_extrude_013.step | Volume +11% | Extrusion nose wrong |
| punch_trim_016.step | Topology 0.42 | Trim angle lost |
| punch_coin_019.step | Features 6→3 | Coining detail lost |
| punch_emboss_022.step | Volume -7% | Emboss depth wrong |

**Root Cause Summary:** Punch geometries have tight-tolerance features at the working end. Current system underestimates feature complexity in the punch point/nose region.

### Pattern: Casing Pocket Errors (4 failures)

| File | Issue | Root Cause |
|------|-------|------------|
| casing_holder_003.step | Features 15→9 | Mounting holes merged |
| casing_block_008.step | Volume +6% | Relief pocket depth wrong |
| casing_plate_012.step | Topology 0.65 | Dowel patterns not recognized |
| casing_shoe_017.step | BBox X +4% | Width tolerance violated |

### Pattern: Stripper Complexity (4 failures)

| File | Issue | Root Cause |
|------|-------|------------|
| stripper_spring_002.step | Features 8→4 | Spring pockets merged |
| stripper_urethane_006.step | Volume -9% | Urethane cavity wrong |
| stripper_guided_010.step | Topology 0.58 | Guide pin holes lost |
| stripper_backing_014.step | Features 10→5 | Bolt pattern simplified |

### Pattern: Pilot/Bushing Issues (6 failures)

| File | Issue | Root Cause |
|------|-------|------------|
| bushing_guide_003.step | Volume +7% | ID/OD relationship wrong |
| bushing_head_007.step | Topology 0.62 | Head profile lost |
| pilot_spring_002.step | Features 5→2 | Shoulder lost |
| pilot_headed_005.step | Volume -6% | Head undersize |
| pilot_flush_008.step | BBox Z -4% | Length wrong |
| pilot_quick_011.step | Topology 0.48 | Quick-change features lost |

### Errors (5)

| File | Error | Recommendation |
|------|-------|----------------|
| die_legacy_1998.step | STEP AP203 parse error | Add AP203 support |
| punch_metric_ジム.step | Unicode filename | Add Unicode path handling |
| casing_corrupt.step | Malformed STEP | Add validation layer |
| stripper_huge.step | Memory limit (2.1GB) | Add streaming parser |
| pilot_encrypted.step | DRM-protected file | Skip encrypted files |

## Performance Metrics

| Metric | Value |
|--------|-------|
| Total Runtime | 18.7s |
| Avg per Test | 187ms |
| Min per Test | 45ms |
| Max per Test | 1,240ms |
| Memory Peak | 1.8GB |

## Recommendations

⛔ **ALL ITEMS ARE BLOCKING** — 100% pass rate required before release.

### 1. MUST FIX — Die Parts (11 failures, CRITICAL)

- **Multi-station progressive die recognition** — Detect station boundaries
- **Slug pocket depth extraction** — Improve slug clearance detection
- **Pilot hole pattern detection** — Recognize bolt circle patterns
- **Shear angle feature preservation** — Maintain cutting edge geometry
- **Draw radius measurement** — Better curved surface analysis
- **Cam action geometry** — Support sliding/rotating cam features

### 2. MUST FIX — Punch Parts (8 failures, CRITICAL)

- **Point geometry extraction** — High-precision tip analysis
- **Form profile preservation** — Maintain forming contours
- **Shoulder dimension accuracy** — Better cylindrical feature sizing
- **Notch detail separation** — Don't merge adjacent features
- **Extrusion nose geometry** — Forward extrusion punch tips
- **Coining detail preservation** — Micro-feature detection

### 3. MUST FIX — Casing/Stripper/Pilot (10 failures)

- **Hole pattern recognition** — Bolt circles, dowel patterns
- **Relief pocket depth** — Clearance feature extraction
- **Spring pocket detection** — Spring cavity recognition
- **Guide pin hole preservation** — Precision hole features
- **ID/OD relationship** — Concentric feature analysis

### 4. MUST FIX — Errors (5)

- **AP203 STEP support** — Add legacy STEP parser
- **Unicode path handling** — UTF-8 filename support
- **File validation layer** — Pre-parse validation
- **Streaming parser** — Handle large files
- **Encrypted file detection** — Skip/warn on DRM

## Gap Analysis for 100% Target

| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| Progressive die station detection | 8 failures | High | P0 |
| Punch tip geometry | 6 failures | Medium | P0 |
| Hole pattern recognition | 4 failures | Low | P1 |
| Pocket depth accuracy | 3 failures | Low | P1 |
| Form profile preservation | 3 failures | Medium | P1 |
| AP203 STEP support | 1 error | Medium | P2 |
| Streaming parser | 1 error | High | P2 |
| Unicode/validation | 3 errors | Low | P2 |

## Next Steps

1. Address P0 gaps (progressive die + punch tip) — estimated 14 failures fixed
2. Address P1 gaps (hole patterns + pockets + profiles) — estimated 10 failures fixed
3. Address P2 gaps (errors) — estimated 5 errors fixed
4. Re-run validation with U-CADC25 (high complexity parts)

## JM Die Validation Context

These parts are from JM Die Company's production archive:
- **Customers:** ITW, Alcoa, Optimas, SFS, Holo-Krome
- **Industries:** Aerospace, automotive, fastener, medical
- **Tolerances:** ±0.0005" to ±0.001" on critical features
- **Materials:** D2, A2, M2, S7 tool steels; carbide inserts

**A regeneration error on a die cavity = wrong stamped parts = scrapped product = customer liability.**

---

**Generated by:** CAD Regeneration Test Harness v1.0.0 (U-CADC22)
**Engine:** CADRegenerationTestEngine (U-CADC21)
**Milestone:** CAD-COMPLETE-MS0
