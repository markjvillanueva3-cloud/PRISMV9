---
name: tribal-cw-008
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "afr", "slots", "open-slot", "closed-slot"]
confidence: 86
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-008.md
promoted_at: 2026-06-09T22:31:15.989Z
---

# Slot Detection — Distinguish Open vs. Closed Slots for Proper Strategy

AFR classifies slots as open (through-wall) or closed (blind) and assigns different default operations accordingly. Open slots allow conventional approach from the side, while closed slots require plunge or helical entry. When AFR misclassifies a nearly-open slot (wall thickness < 1mm), manually override to open slot type to avoid unnecessary helical entries that add cycle time.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:camworks-docs
**Operations:** milling, slotting

## Related
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-002|Custom Feature Templates — Teach AFR to Recognize Shop-Specific Geometry]]
- [[camworks-cam-tips-cw-004|Multi-Axis Feature Recognition — Detect Features Across Index Angles]]
- [[camworks-cam-tips-cw-005|Turned Feature Recognition — Automatic Detection of Lathe Geometry]]
- [[camworks-cam-tips-cw-006|Hole Pattern Recognition — Group Identical Holes for Batch Operations]]
