---
id: "cim-039"
title: "Process Variability in Electrode Spark Gap Control"
source: "web:cimatron-tutorials"
confidence: 0.83
category: "cam_strategy"
tags: ["spark-gap", "variability", "electrode", "edm-tolerance"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.013Z
---

# Process Variability in Electrode Spark Gap Control

Account for spark gap variability in EDM electrode design. Nominal gap: 0.15-0.25mm per side depending on generator settings. Variability: ±0.02mm from electrode wear, ±0.01mm from thermal expansion, ±0.005mm from flushing pressure variations. Design electrodes with Cimatron's 'Undersize' parameter set to the mean spark gap. Use multiple electrodes (rough/semi/finish) to manage cumulative wear uncertainty.

**Category:** cam_strategy
**Confidence:** 0.83
**Source:** web:cimatron-tutorials
**Operations:** electrode_machining

## Related
- [[mastercam-cam-tips-mc-142|Electrode creation from solid bodies automates EDM electrode design and machining]]
- [[tebis-cam-tips-teb-007|Electrode Design-to-NC Workflow Covers Full EDM Process]]
- [[topsolid-cam-tips-ts-057|Spark Gap Management with Per-Surface Control]]
- [[topsolid-cam-tips-ts-150|TopSolid Electrode Design — Automatic Electrode Extraction from Cavity]]
- [[worknc-cam-tips-wnc-145|WorkNC Designer Electrode Geometry — Extracting Burn Shapes]]
