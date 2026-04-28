---
id: "cat-029"
title: "Impeller Blade Machining Requires Split Roughing and Finishing"
source: "web:catia-docs"
confidence: 88
category: "cam_strategy"
tags: ["catia", "impeller", "blade", "5-axis", "split-strategy"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.823Z
---

# Impeller Blade Machining Requires Split Roughing and Finishing

For impeller machining in CATIA, split the process into channel roughing (3-axis ZLevel or multi-slice), blade semi-finish (5-axis sweep along blade surface), and blade finish (5-axis isoparametric along flow lines). The critical challenge is blade thinning — modern impeller blades are warped and tapered, making swarf cutting impossible. Use a tapered ball-nose cutter and machine the full blade height in one continuous pass per side to avoid step marks that cause aerodynamic performance loss.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:catia-docs
**Operations:** multi_axis_sweeping, multi_axis_curve

## Related
- [[catia-cam-tips-cat-030|Blade Root Fillet Machining With Tapered Ball Nose]]
- [[camworks-cam-tips-cw-051|Blade and Impeller Machining — Dedicated 5-Axis Strategies]]
- [[edgecam-cam-tips-ec-030|5-Axis Blade and Impeller Machining]]
- [[esprit-cam-tips-esp-034|5-Axis Impeller Machining with Hub/Blade/Splitter Control]]
- [[gibbscam-cam-tips-gc-177|GibbsCAM 5-axis flow-line machining follows UV surface parameterization for blades]]
