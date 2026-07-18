---
name: tribal-mc-242
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "optirough", "undercut", "stock-detection", "t-slot", "dovetail"]
confidence: 85
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-242.md
promoted_at: 2026-06-09T22:31:16.455Z
---

# Mastercam Dynamic OptiRough detects undercut stock conditions and adjusts roughing automatically

When roughing parts with undercut features (T-slots, dovetails, recessed flanges), standard toolpaths cannot detect material hiding under overhanging geometry. Mastercam's Dynamic OptiRough with undercut detection analyzes the stock model in 3D and identifies regions where material exists below overhanging surfaces. It then generates toolpath that reaches under the overhang using the tool's side-cutting geometry, provided the tool can physically access the region. Enable 'Check for Undercuts' in the OptiRough parameters. The tool must have sufficient reach (shank clearance) to access the undercut zone — verify in Machine Simulation with the full tool and holder assembly. For parts with true undercuts that require a lollipop or T-slot cutter, program a separate operation with the specialty tool and reference the OptiRough stock model to target only the undercut material.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:mastercam-docs
**Operations:** roughing

## Related
- [[mastercam-cam-tips-mc-043|OptiRough Critical Depths in 2026 flatten stepped floors automatically]]
- [[mastercam-cam-tips-mc-053|3+2 Automatic Roughing outperforms OptiRough on steep-walled prismatic parts]]
- [[mastercam-cam-tips-mc-094|Stock Model comparison to CAD reveals both overcut and undercut regions visually]]
- [[mastercam-cam-tips-mc-298|Mastercam OptiRough morphing between roughing levels maximizes material removal on near-net-shape stock]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
