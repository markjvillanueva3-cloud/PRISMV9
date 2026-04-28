---
id: "ts-055"
title: "Burn Vector Definition Controls EDM Erosion Direction"
source: "web:topsolid-burnvector"
confidence: 90
category: "cam_strategy"
tags: ["burn-vector", "edm", "direction", "electrode"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.428Z
---

# Burn Vector Definition Controls EDM Erosion Direction

The burn vector defines the direction of electrode approach during EDM. TopSolid allows defining primary, secondary, and orbiting burn vectors for each electrode. The primary vector is typically normal to the parting surface, while secondary vectors handle undercut features. For complex cavity geometries requiring multiple burn directions, create separate electrode sets for each vector. Store burn vectors as named directions in the electrode document for unambiguous shop-floor communication.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-burnvector
**Operations:** edm

## Related
- [[catia-cam-tips-cat-192|Electrode Design and Machining Integration in CATIA]]
- [[cimatron-cam-tips-cim-002|Electrode Extraction from Mold Cavity]]
- [[cimatron-cam-tips-cim-148|Copper Electrode Machining Parameters]]
- [[edgecam-cam-tips-ec-135|Edgecam Designer Offset Surface for Electrode Design]]
- [[gibbscam-cam-tips-gc-195|GibbsCAM micro-electrode EDM preparation machines graphite electrodes to micron precision]]
