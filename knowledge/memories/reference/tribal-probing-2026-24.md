---
type: tribal-consolidation
topic: probing
iso_week: 2026-24
cluster_size: 18
cluster_size_synthesized: 10
aggregate_confidence: 87.9
tags: ["document-learned", "doc:doc-hypermill-software-documentation-hypermill-2d-3d", "setup-probing", "wcs", "touch-probe", "retract", "mode", "security"]
materials: []
operations: ["profiling", "contouring", "probing", "finishing"]
_consolidatedAt: 2026-06-09T06:33:51.702Z
epistemic_only: true
consumed_by_machining: false
milestone: OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE
---
# Tribal: probing — 2026-24

_18 tips clustered on 'probing' with mean confidence 87.9/100. The vault is supposed to talk back; this is what it heard from the shop floor this week._

## Top Tips (10)

### 1. Specify retract mode for probing

- **id:** `TK-DL-doc-hypermill-software-documentation-hypermill-2d-3d-322` · **confidence:** 95/100 · **usage:** 0
- **source:** document:doc-hypermill-software-documentation-hypermill-2d-3d
- **tags:** retract, mode, document-learned, doc:doc-hypermill-software-documentation-hypermill-2d-3d

Retract mode defines the Z level where retract movements are executed.

### 2. Set security plane for probing

- **id:** `TK-DL-doc-hypermill-software-documentation-hypermill-2d-3d-323` · **confidence:** 95/100 · **usage:** 0
- **source:** document:doc-hypermill-software-documentation-hypermill-2d-3d
- **tags:** security, plane, document-learned, doc:doc-hypermill-software-documentation-hypermill-2d-3d

Specify the level of the security plane.

### 3. Define probing modes for accuracy measurement

- **id:** `TK-DL-doc-hypermill-software-documentation-hypermill-2d-3d-319` · **confidence:** 90/100 · **usage:** 0
- **source:** document:doc-hypermill-software-documentation-hypermill-2d-3d
- **tags:** 3D Point Probing, Rectangular Probing, Circular Probing, document-learned, doc:doc-hypermill-software-documentation-hypermill-2d-3d

Available modes include Automatic, Manual, and Axis dependent.

### 4. Set infeed length for probing

- **id:** `TK-DL-doc-hypermill-software-documentation-hypermill-2d-3d-321` · **confidence:** 90/100 · **usage:** 0
- **source:** document:doc-hypermill-software-documentation-hypermill-2d-3d
- **tags:** infeed, toolpath, document-learned, doc:doc-hypermill-software-documentation-hypermill-2d-3d

Infeed length (1): Length of the toolpath at the feedrate to the surface contact of the ball of the probing tool.

### 5. Define measuring depth for probing

- **id:** `TK-DL-doc-hypermill-software-documentation-hypermill-2d-3d-324` · **confidence:** 90/100 · **usage:** 0
- **source:** document:doc-hypermill-software-documentation-hypermill-2d-3d
- **tags:** measuring, depth, document-learned, doc:doc-hypermill-software-documentation-hypermill-2d-3d, operation:profiling

Measuring depth (4): Corresponds to the contour depth.

### 6. Use Circular Probing for measuring cylinders and holes

- **id:** `TK-DL-doc-hypermill-software-documentation-hypermill-2d-3d-325` · **confidence:** 90/100 · **usage:** 0
- **source:** document:doc-hypermill-software-documentation-hypermill-2d-3d
- **tags:** circular probing, measuring tools, document-learned, doc:doc-hypermill-software-documentation-hypermill-2d-3d

Select 'Circular Probing' in the probing mode to measure the size and location of cylindrical and hole features.

### 7. Setup Probing for Automatic WCS Alignment

- **id:** `bc-119` · **confidence:** 87/100 · **usage:** 0
- **source:** web:bobcad-probing
- **tags:** setup-probing, wcs, touch-probe, renishaw, blum, controller:heidenhain

BobCAD programs touch probe cycles for automatic WCS alignment: 3-point plane for Z-datum, 2-point edge for X-datum, single-point for Y-datum. Probe results store in work offset registers (G54-G59). Machine Simulation PRO verifies probe mov…

### 8. Setup Probing for Automatic WCS Alignment

- **id:** `sc2-114` · **confidence:** 87/100 · **usage:** 0
- **source:** web:surfcam-probing
- **tags:** setup-probing, wcs, touch-probe, work-offset, alignment

SURFCAM setup probing programs the machine's touch probe to automatically find the part position and set work offsets. Program a 3-point plane probe for Z-datum, a 2-point edge probe for X-datum, and a single-point probe for Y-datum. The pr…

### 9. In-Process Inspection for Critical Dimensions

- **id:** `sc2-117` · **confidence:** 87/100 · **usage:** 0
- **source:** web:surfcam-in-process
- **tags:** in-process-inspection, critical-dimensions, conditional, macro, operation:finishing, operation:boring

SURFCAM in-process inspection inserts probing cycles between machining operations to verify critical dimensions before proceeding. For example, probe a bore diameter after semi-finish boring — if it's oversized, skip the finish bore and ale…

### 10. Part Alignment Probing for Irregular Stock

- **id:** `bc-120` · **confidence:** 86/100 · **usage:** 0
- **source:** web:bobcad-alignment-probing
- **tags:** alignment-probing, castings, best-fit, g68, simulation

For castings and forgings, BobCAD programs multi-point probing to measure datum features and compute best-fit alignment. Measures 6+ points and calculates optimal work offset and rotation (G68). Eliminates 30-60 minute manual indicating. Ou…

## Common Threads

Top tags across the cluster: `document-learned`, `doc:doc-hypermill-software-documentation-hypermill-2d-3d`, `setup-probing`, `wcs`, `touch-probe`, `retract`, `mode`, `security`.

## Sources Cited

- document:doc-hypermill-software-documentation-hypermill-2d-3d (6)
- web:bobcad-probing (1)
- web:surfcam-probing (1)
- web:surfcam-in-process (1)
- web:bobcad-alignment-probing (1)

## Citations

- [[TK-DL-doc-hypermill-software-documentation-hypermill-2d-3d-322]]
- [[TK-DL-doc-hypermill-software-documentation-hypermill-2d-3d-323]]
- [[TK-DL-doc-hypermill-software-documentation-hypermill-2d-3d-319]]
- [[TK-DL-doc-hypermill-software-documentation-hypermill-2d-3d-321]]
- [[TK-DL-doc-hypermill-software-documentation-hypermill-2d-3d-324]]
- [[TK-DL-doc-hypermill-software-documentation-hypermill-2d-3d-325]]
- [[bc-119]]
- [[sc2-114]]
- [[sc2-117]]
- [[bc-120]]

