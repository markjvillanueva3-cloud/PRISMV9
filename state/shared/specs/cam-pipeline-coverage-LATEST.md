# CAM Pipeline Coverage Scorer baseline

Generated: 2026-05-28T02:39:55.080Z
Engines scanned: 3324 | Dispatchers: 99 | Tests scanned: 3646

## Ranking (highest normalized score = easiest end-to-end CAM)

| Rank | Platform | Raw | Normalized | Plat-specific stages | Bridge kind | Autodesk MCP |
|---|---|---|---|---|---|---|
| 1 | HyperMill (+HyperCAD-S) | 461 | **92** | 6/10 | in-host | no |
| 2 | Inventor HSM | 464.5 | **91** | 6/10 | none | yes |
| 3 | Fusion 360 | 451.5 | **79.5** | 3/10 | socket | yes |
| 4 | Mastercam X8 | 446 | **72.5** | 3/10 | none | no |
| 5 | NX CAM | 445 | **71.5** | 3/10 | none | no |
| 6 | Esprit | 439 | **64** | 2/10 | none | no |
| 7 | SolidCAM | 436 | **61** | 2/10 | none | no |
| 8 | PowerMill | 436 | **61** | 2/10 | none | no |

## Per-stage matrix (cell shows normalized score; B = has platform-specific evidence)

| Stage | HyperMill (+HyperCAD-S) | Inventor HSM | Fusion 360 | Mastercam X8 | NX CAM | Esprit | SolidCAM | PowerMill |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Program intake (CAD→CAM handoff or existing CAM file) | 9.5 B | 6 | 6 | 6 | 6 | 6 | 6 | 6 |
| Machine selection (ERP + availability + capability) | 6 | 9.5 B | 6 | 6 | 6 | 6 | 6 | 6 |
| Stock size + allowance | 8 B | 11.5 B | 6 | 6 | 6 | 6 | 6 | 6 |
| Workholding (Kurt vise + soft-jaw + ROI clamping) | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 |
| Operation order (interrupted-cut + air-cut + chip thickness) | 8 B | 6 | 6 | 6 | 6 | 6 | 6 | 6 |
| Tool + holder selection (ROI-aware) | 6 | 9.5 B | 6 | 6 | 6 | 6 | 6 | 6 |
| Use machine capabilities (taper / spindle / kinematics / envelope / controller / params) | 16 B | 7.5 B | 9.5 B | 11.5 B | 9.5 B | 6 | 6 | 6 |
| Post-emit (optimized + cost-efficient + accurate + safe) | 13 B | 16 B | 14.5 B | 11 B | 11.5 B | 9.5 B | 8 B | 8 B |
| Setup sheet generation | 16.5 B | 16 B | 16.5 B | 11 B | 11.5 B | 9.5 B | 8 B | 8 B |
| Closed-loop feedback (outcome → corpus delta → retrain signal) | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 |

Legend: B = has platform-specific evidence (intersect engines / per-platform tests / dispatcher tokens at this stage).

## Methodology

- **scoring**: intersect_engines × 2 + shared_engines × 1.5 + dispatcher_tokens × 1 + tests × 1.5
- **normalization**: Caps applied per delta F7: intersect_engines ≤ 5, shared_engines ≤ 4, dispatcher_tokens ≤ 8
- **bridgeKindMeaning**: socket = independent-process driving; in-host = plugin requires host app running; none = no live driving
- **f7Tautology**: hasPlatformEvidence flag exposes when a cell shows coverage only via shared engines, not platform-specific ones

## Caveats

- Coverage = engine-file count + dispatcher-action mentions + test count; measures BREADTH of substrate, NOT runtime correctness.
- Normalization caps engine credit; still does not measure integration depth or operator-ready completeness.
- Static scan, not runtime probe. Runtime gate is the CAM-TEST-PLAYBOOK live-drive tier 2+.
- Bridge-kind tracking is per-platform metadata, not auto-detected from engine files — update PLATFORMS array when bridges land.