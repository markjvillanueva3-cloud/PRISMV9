---
name: tribal-ts-121
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["burn-sequence", "electrode", "edm", "multi-feature"]
confidence: 90
source: "web:topsolid-burnseq"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-121.md
promoted_at: 2026-05-26T16:07:21.114Z
---

# Electrode Burn Sequencing for Multi-Feature Cavities

TopSolid manages the electrode burn sequence for complex cavities requiring multiple electrodes. The burn plan defines: electrode order (roughers before finishers), burn parameters per electrode (current, pulse, gap), and quality verification points between burns. Create the burn sequence document in TopSolid with links to each electrode's CAM program and EDM settings. The sequence respects dependencies—certain features must be burned before adjacent features to maintain datum integrity and prevent re-work.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-burnseq
**Operations:** edm

## Related
- [[catia-cam-tips-cat-192|Electrode Design and Machining Integration in CATIA]]
- [[cimatron-cam-tips-cim-002|Electrode Extraction from Mold Cavity]]
- [[cimatron-cam-tips-cim-148|Copper Electrode Machining Parameters]]
- [[edgecam-cam-tips-ec-135|Edgecam Designer Offset Surface for Electrode Design]]
- [[gibbscam-cam-tips-gc-195|GibbsCAM micro-electrode EDM preparation machines graphite electrodes to micron precision]]
