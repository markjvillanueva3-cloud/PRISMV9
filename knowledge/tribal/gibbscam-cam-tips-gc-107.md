---
id: "gc-107"
title: "Cusp height analysis identifies regions needing additional finishing passes"
source: "web:gibbscam-docs"
confidence: 86
category: "cam_strategy"
tags: ["gibbscam", "surface-quality", "cusp-height", "analysis", "targeted-cleanup"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.915Z
---

# Cusp height analysis identifies regions needing additional finishing passes

After generating a finishing toolpath in GibbsCAM, use the stock comparison tool to analyze cusp height distribution across the part surface. Regions exceeding the target cusp height (typically due to surface curvature changes or toolpath transitions) need additional localized passes. Rather than re-running the entire finish operation with a tighter stepover (which wastes time on compliant regions), create a targeted cleanup operation limited to the non-conforming zones. Define containment boundaries around these zones and apply a tighter-stepover strategy locally.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-104|Scallop height calculation drives stepover selection for target Ra]]
- [[gibbscam-cam-tips-gc-105|Tolerance setting controls toolpath point density and surface fidelity]]
- [[gibbscam-cam-tips-gc-106|Point distribution uniformity prevents surface banding on 3D finishes]]
- [[gibbscam-cam-tips-gc-108|Surface analysis tools detect curvature discontinuities that cause finish defects]]
- [[gibbscam-cam-tips-gc-178|GibbsCAM 5-axis tool axis smoothing prevents jerky rotary motion and surface marks]]
