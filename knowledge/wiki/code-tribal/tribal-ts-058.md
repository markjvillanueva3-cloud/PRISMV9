---
name: tribal-ts-058
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["copper", "graphite", "electrode", "material-selection"]
confidence: 91
source: "web:topsolid-material"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-058.md
promoted_at: 2026-05-26T16:07:20.760Z
---

# Copper vs Graphite Electrode Selection Strategy

TopSolid's electrode workflow supports both copper and graphite materials with appropriate machining strategies for each. Use graphite (POCO EDM-3/AF-5) for large electrodes, thin ribs, and high MRR roughing burns. Use copper (C11000 tellurium-free) for fine detail, small gaps (<0.05 mm), and mirror-finish EDM surfaces. In TopSolid, assign the electrode material in the document properties to automatically load appropriate cutting data. Graphite requires dust collection; copper requires flood coolant.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:topsolid-material
**Operations:** edm

## Related
- [[hypermill-cam-tips-ext-hm-134|Electrode Machining Workflow]]
- [[sprutcam-cam-tips-spr-154|Electrode Machining for EDM]]
- [[sprutcam-cam-tips-spr-170|Electrode Machining for EDM Precision]]
- [[topsolid-cam-tips-ts-054|Electrode Blank Design with Material Optimization]]
- [[topsolid-cam-tips-ts-151|TopSolid Electrode Blank Optimization — Minimize Graphite/Copper Waste]]
