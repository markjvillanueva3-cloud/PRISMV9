---
id: "f360-102"
title: "Design-to-CAM Associativity Preserves Toolpaths"
source: "web:fusion360-docs"
confidence: 86
category: "automation"
tags: ["fusion360", "associativity", "design-cam", "manufacturing-model", "updates"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.707Z
---

# Design-to-CAM Associativity Preserves Toolpaths

Fusion's associative link between the Design and Manufacture workspaces means that when the design changes, toolpaths update automatically to match the new geometry. However, large geometric changes (deleted faces, remodeled features) can break toolpath references. To protect against this, use Manufacturing Models — a frozen copy of the design body used exclusively for CAM. Update the manufacturing model manually when you are ready to re-program, rather than having every design tweak trigger a toolpath recomputation.

**Category:** automation
**Confidence:** 86
**Source:** web:fusion360-docs
**Operations:** general

## Related
- [[fusion360-cam-tips-ext-f360-113|Manufacturing Models for Stable CAM References]]
- [[fusion360-cam-tips-ext-f360-114|Setup from Manufacturing Model with Fixture Bodies]]
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
- [[fusion360-cam-tips-ext-f360-042|Rest Machining Adaptive with Tight Tolerance Overlap]]
