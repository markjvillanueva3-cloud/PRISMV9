---
id: "wnc-014"
title: "Z-Level Roughing with Automatic Rest Detection"
source: "web:worknc-zlevel"
confidence: 92
category: "cam_strategy"
tags: ["z-level", "roughing", "rest-detection", "stock-model"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.632Z
---

# Z-Level Roughing with Automatic Rest Detection

WorkNC's Z-level roughing automatically detects remaining stock at each depth level and generates passes only where material exists. The system builds a progressive stock model that updates after each Z-level. Set the Z-step based on the maximum recommended depth of cut for the tool (typically 50-80% of insert length for indexable tools). Enable 'Automatic level optimization' to skip empty levels.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:worknc-zlevel
**Operations:** roughing, 3d_roughing

## Related
- [[bobcad-cam-tips-bc-029|Waterline Roughing for Cavity and Core Work]]
- [[camworks-cam-tips-cw-033|Z-Level Roughing — Waterline Strategy for 3D Cavity Stock Removal]]
- [[catia-cam-tips-cat-043|Multi-Slice Roughing Maximizes Material Removal Rate]]
- [[catia-cam-tips-cat-048|Z-Level Roughing With Helical Entry for Hard Materials]]
- [[esprit-cam-tips-esp-011|Z-Level Roughing Step-Down Strategy for Complex Surfaces]]
