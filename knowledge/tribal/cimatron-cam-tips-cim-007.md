---
id: "cim-007"
title: "Multi-Setup Mold Core/Cavity Coordination"
source: "web:cimatron-docs"
confidence: 0.85
category: "cam_strategy"
tags: ["multi-setup", "mold", "core-cavity", "datum"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.987Z
---

# Multi-Setup Mold Core/Cavity Coordination

When machining mold core and cavity as separate setups, use Cimatron's NC Setup Manager to define shared coordinate systems. Set the master datum on the parting line for both halves. Use 'Transfer Stock' between setups so the cavity roughing IPW feeds into the finishing setup, eliminating redundant air passes.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:cimatron-docs
**Operations:** setup

## Related
- [[catia-cam-tips-cat-183|Datum Feature Reference Consistency Across Machining Setups]]
- [[cimatron-cam-tips-cim-092|Workplane Management for Multi-Setup Molds]]
- [[powermill-cam-tips-pm-057|Workplane Management for Multi-Setup Parts]]
- [[powermill-cam-tips-pm-071|Multi-Setup Coordinate System Alignment]]
- [[powermill-cam-tips-pm-139|Multi-Setup Alignment with Probing]]
