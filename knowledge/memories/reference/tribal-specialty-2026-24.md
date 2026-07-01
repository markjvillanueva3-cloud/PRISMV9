---
type: tribal-consolidation
topic: specialty
iso_week: 2026-24
cluster_size: 6
cluster_size_synthesized: 6
aggregate_confidence: 85.2
tags: ["operation:roughing", "operation:finishing", "mold", "impeller", "operation:plunge_milling", "operation:5_axis", "rib-machining", "thin-wall"]
materials: ["N"]
operations: ["specialty", "setup"]
_consolidatedAt: 2026-06-09T06:33:51.702Z
epistemic_only: true
consumed_by_machining: false
milestone: OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE
---
# Tribal: specialty — 2026-24

_6 tips clustered on 'specialty' with mean confidence 85.2/100. The vault is supposed to talk back; this is what it heard from the shop floor this week._

## Top Tips (6)

### 1. Rib Machining for Deep Thin Ribs in Mold Cavities

- **id:** `teb-066` · **confidence:** 87/100 · **usage:** 0
- **source:** web:tebis-docs
- **tags:** rib-machining, thin-wall, progressive, deflection, operation:roughing

Tebis rib machining handles deep, thin ribs by progressively machining with shorter-to-longer tools to maintain wall support. Set minimum rib width threshold and maximum tool projection ratio (typically 5:1 L/D). The system calculates inter…

### 2. Electrode Design and Machining Workflow

- **id:** `teb-067` · **confidence:** 86/100 · **usage:** 0
- **source:** web:tebis-docs
- **tags:** electrode, mold, graphite, erowa, material:N, material:copper

Tebis provides integrated electrode design: extract electrode geometry from cavity, define blank and holder (EROWA/3R), program roughing and finishing. Apply different undersizes: roughing electrodes 0.3mm/side, finishing electrodes 0.05mm/…

### 3. Core/Cavity Split Surface Management

- **id:** `teb-068` · **confidence:** 85/100 · **usage:** 0
- **source:** web:tebis-docs
- **tags:** core-cavity, parting-surface, mold, split

Tebis handles core/cavity splits with automatic parting surface generation. Define the parting line, and Tebis creates the parting surface extending to the mold base boundary. Use these surfaces as machining boundaries — separate toolpaths …

### 4. Electrode Set Management for Complex Cavities

- **id:** `teb-182` · **confidence:** 85/100 · **usage:** 0
- **source:** web:tebis-docs
- **tags:** electrode-set, management, complex-cavity, organization, operation:roughing, operation:finishing

Complex cavities need 20-50 electrodes. Organize by burn area, then roughing/finishing. Name: PART-AREA-TYPE-SEQ. Generate setup sheets with burn positions, spark gaps, depth targets. Track status (new/used/worn). Tebis electrode module man…

### 5. Tebis Blade Module for Turbine Components

- **id:** `teb-137` · **confidence:** 84/100 · **usage:** 0
- **source:** web:tebis-docs
- **tags:** blade, turbine, blisk, impeller, operation:roughing, operation:finishing

Tebis blade module handles blisks, impellers, and individual blades. Define hub, shroud, blade surfaces, splitter blades. Generate roughing (plunge between blades), semi-finishing, and hub finishing toolpaths. Use barrel cutters for blade f…

### 6. Impeller 5-Axis Roughing Strategy

- **id:** `teb-181` · **confidence:** 84/100 · **usage:** 0
- **source:** web:tebis-docs
- **tags:** impeller, plunge-roughing, blade-passage, 5-axis, operation:profiling, operation:roughing

Plunge roughing between impeller blades removes bulk safely. Axial forces into hub (strongest direction). Step-over 50-60% of diameter. Then 5-axis contour roughing for passages. Tebis blade module manages plunge-to-contour transition autom…

## Common Threads

Top tags across the cluster: `operation:roughing`, `operation:finishing`, `mold`, `impeller`, `operation:plunge_milling`, `operation:5_axis`, `rib-machining`, `thin-wall`.

## Sources Cited

- web:tebis-docs (6)

## Citations

- [[teb-066]]
- [[teb-067]]
- [[teb-068]]
- [[teb-182]]
- [[teb-137]]
- [[teb-181]]

