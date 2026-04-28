---
id: "nx-122"
title: "Mold Wizard Integration for Die/Mold Programming"
source: "web:siemens-nx-docs"
confidence: 0.86
category: "cam_strategy"
tags: ["mold-wizard", "core-cavity", "parting", "associativity"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.422Z
---

# Mold Wizard Integration for Die/Mold Programming

NX Mold Wizard creates core/cavity splits, parting surfaces, and electrode extraction. The manufacturing operations inherit Mold Wizard data: parting line boundaries become machining boundaries, extracted electrodes carry EDM parameters. Use 'Manufacturing Link' to maintain associativity — when the mold design changes, machining operations update automatically. This reduces reprogramming time by 60-70%.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:siemens-nx-docs
**Operations:** setup

## Related
- [[cimatron-cam-tips-cim-069|Core/Cavity Parting Surface Generation]]
- [[nx-cam-tips-ext-nx-174|Electrode Machining via Mold Wizard]]
- [[catia-cam-tips-cat-191|Core/Cavity Split Surface Machining Strategy in CATIA]]
- [[cimatron-cam-tips-cim-007|Multi-Setup Mold Core/Cavity Coordination]]
- [[mastercam-cam-tips-mc-141|Core/cavity split machining uses separate machine groups for each mold half]]
