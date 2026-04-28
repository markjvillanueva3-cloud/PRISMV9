---
id: "esp-168"
title: "Hybrid Additive-Subtractive Programming in ESPRIT"
source: "web:esprit-docs"
confidence: 0.82
category: "cam_strategy"
tags: ["additive", "hybrid", "lmd", "ded", "subtractive"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.604Z
---

# Hybrid Additive-Subtractive Programming in ESPRIT

ESPRIT supports hybrid manufacturing on machines with both additive (DED/LMD) and subtractive (milling/turning) capability (DMG Mori Lasertec, Mazak Integrex AM). Program alternating additive and subtractive operations: (1) deposit material via laser metal deposition (LMD), (2) machine the deposited region to final dimensions, (3) deposit the next layer/feature, (4) machine again. ESPRIT manages the stock model through both additive (material addition) and subtractive (material removal) phases, ensuring accurate rest-machining calculations after each additive pass.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:esprit-docs
**Operations:** additive, roughing, 3d_finishing

## Related
- [[catia-cam-tips-cat-160|Hybrid Manufacturing: Additive STL to Subtractive CATIA Workflow]]
- [[cimatron-cam-tips-cim-146|Additive/Hybrid Manufacturing for Mold Repair]]
- [[nx-cam-tips-ext-nx-128|Additive Manufacturing in NX]]
- [[powermill-cam-tips-pm-070|Additive/Hybrid Manufacturing with PowerMill]]
- [[powermill-cam-tips-pm-144|Additive Deposition Path Planning]]
