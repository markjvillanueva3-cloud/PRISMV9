---
name: tribal-cat-029
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "impeller", "blade", "5-axis", "split-strategy"]
confidence: 88
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-029.md
promoted_at: 2026-06-09T22:31:16.037Z
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
