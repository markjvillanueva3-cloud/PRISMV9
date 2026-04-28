---
id: "ts-056"
title: "Electrode Families for Roughing and Finishing Burns"
source: "web:topsolid-family"
confidence: 91
category: "cam_strategy"
tags: ["electrode-family", "rougher", "finisher", "spark-gap"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.429Z
---

# Electrode Families for Roughing and Finishing Burns

TopSolid supports electrode families where multiple electrodes of different sizes are created for the same feature. A typical family includes: rougher (0.3-0.5 mm oversize per side), semi-finisher (0.1-0.15 mm oversize), and finisher (0.02-0.05 mm oversize). The family is managed as a linked set—changes to the base geometry propagate to all family members. Each member has its own spark gap and machining program. Use POCO EDM-3 graphite for roughers and EDM-200 for finishers.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:topsolid-family
**Operations:** edm

## Related
- [[topsolid-cam-tips-ts-154|TopSolid Multi-Electrode Management — Rougher/Finisher/Orbiter Sets]]
- [[worknc-cam-tips-wnc-149|Electrode Set Management — Rougher, Finisher, and Orbiter]]
- [[cimatron-cam-tips-cim-039|Process Variability in Electrode Spark Gap Control]]
- [[cimatron-cam-tips-cim-067|Electrode Design Wizard for EDM Electrodes]]
- [[mastercam-cam-tips-mc-142|Electrode creation from solid bodies automates EDM electrode design and machining]]
