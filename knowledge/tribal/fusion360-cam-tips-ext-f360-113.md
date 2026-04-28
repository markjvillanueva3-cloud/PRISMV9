---
id: "f360-113"
title: "Manufacturing Models for Stable CAM References"
source: "web:fusion360-docs"
confidence: 88
category: "automation"
tags: ["fusion360", "manufacturing-model", "snapshot", "design-stability", "references"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.716Z
---

# Manufacturing Models for Stable CAM References

Create a Manufacturing Model (right-click body > Create Manufacturing Model) to decouple CAM programming from live design changes. The manufacturing model is a snapshot of the body at a specific design state — subsequent design edits do not affect it. This prevents toolpath references from breaking when designers modify fillets, add features, or change dimensions. When the design is finalized, create a new manufacturing model and re-apply your saved templates to update the CAM program.

**Category:** automation
**Confidence:** 88
**Source:** web:fusion360-docs
**Operations:** general

## Related
- [[fusion360-cam-tips-ext-f360-102|Design-to-CAM Associativity Preserves Toolpaths]]
- [[fusion360-cam-tips-ext-f360-114|Setup from Manufacturing Model with Fixture Bodies]]
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
- [[fusion360-cam-tips-ext-f360-042|Rest Machining Adaptive with Tight Tolerance Overlap]]
