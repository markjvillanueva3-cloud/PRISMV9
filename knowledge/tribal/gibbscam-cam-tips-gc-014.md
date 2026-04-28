---
id: "gc-014"
title: "Waterline roughing with constant Z-step provides predictable load per level"
source: "web:gibbscam-docs"
confidence: 86
category: "cam_strategy"
tags: ["gibbscam", "waterline", "3d", "roughing", "z-step", "constant-load"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.842Z
---

# Waterline roughing with constant Z-step provides predictable load per level

For 3D roughing in GibbsCAM, waterline (Z-level) roughing with a constant Z-step equal to 0.5-1.0× the axial depth of cut ensures consistent material removal per level. Set 'Leave Stock' uniformly (0.3-0.5mm typical) for the finishing allowance. Enable 'Rest Roughing from Previous Tool' when following a larger rougher to avoid re-cutting already-machined material. The waterline approach is preferred over raster roughing for deep cavities because it naturally follows the part contour and generates fewer air-cut moves.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:gibbscam-docs

## Related
- [[surfcam-cam-tips-sc2-031|Waterline Roughing with Multi-Level Z-Step Control]]
- [[gibbscam-cam-tips-gc-011|Z-level finishing excels on steep walls with constant scallop height]]
- [[gibbscam-cam-tips-gc-012|Flowline finishing follows UV direction for natural surface-aligned passes]]
- [[gibbscam-cam-tips-gc-013|Pencil tracing automatically targets concave fillet intersections]]
- [[gibbscam-cam-tips-gc-015|Scallop height strategy maintains constant cusp height across varying slopes]]
