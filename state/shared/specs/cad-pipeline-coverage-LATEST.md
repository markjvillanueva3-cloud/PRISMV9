# CAD Pipeline Coverage Scorer baseline

Generated: 2026-05-20T03:44:25.975Z
Engines scanned: 3288 | Tests scanned: 3926

## Ranking (highest score = easiest end-to-end)

| Rank | Platform | Raw | Normalized | Plat-specific stages | Bridge kind | Autodesk MCP |
|---|---|---|---|---|---|---|
| 1 | HyperMill (+HyperCAD-S) | 148.25 | **80.25** | 9/9 | in-host | no |
| 2 | Fusion 360 | 107.75 | **51.75** | 9/9 | socket | yes |
| 3 | Inventor | 107.25 | **51.25** | 9/9 | none | yes |
| 4 | Mastercam | 106.75 | **50.75** | 9/9 | none | no |
| 5 | SolidWorks | 106.75 | **50.75** | 9/9 | none | no |
| 6 | CadQuery (headless STEP) | 81.75 | **25.75** | 1/9 | none | no |

## Per-stage matrix (cell = score)

| Stage | Fusion 360 | Mastercam | HyperMill (+HyperCAD-S) | SolidWorks | Inventor | CadQuery (headless STEP) |
| --- | --- | --- | --- | --- | --- | --- |
| Print upload (PDF/picture) | 6 B | 6 B | 6 B | 6 B | 6 B | 3 |
| CAD generation (3D model from print) | 19 B | 18 B | 18 B | 18 B | 18.5 B | 17 |
| Transfer to CAM (hyperMILL focus) | 5 B | 5 B | 20 B | 5 B | 5 B | 2 |
| Auto setup gen per machine | 7 B | 7 B | 7 B | 7 B | 7 B | 4 |
| CAM program (w/ PRISM toolpath injection) | 12.5 B | 12.5 B | 34 B | 12.5 B | 12.5 B | 9.5 |
| Simulation (hyperMILL sim) | 13 B | 13 B | 15 B | 13 B | 13 B | 10 |
| Master post processor (or per-machine perfect post) | 32 B | 32 B | 32.5 B | 32 B | 32 B | 29 |
| Generate setup sheet | 6.25 B | 6.25 B | 8.75 B | 6.25 B | 6.25 B | 3.25 |
| Inspection report (measurement-tool-aware) | 7 B | 7 B | 7 B | 7 B | 7 B | 4 |

Legend: B = named PrintTo<Platform>Bridge engine exists.
