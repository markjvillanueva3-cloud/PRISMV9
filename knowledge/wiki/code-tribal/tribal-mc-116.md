---
name: tribal-mc-116
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "depth-first", "breadth-first", "tool-changes", "ordering", "cycle-time"]
confidence: 84
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-116.md
promoted_at: 2026-06-09T22:31:16.424Z
---

# Depth-first ordering reduces tool changes; breadth-first reduces setup complexity

Depth-first ordering completes all operations at each Z-level before moving deeper (rough all pockets at Z-10, then all at Z-20). This minimizes the number of tool changes but requires the post to manage multiple active tool offset groups. Breadth-first ordering completes each pocket entirely before moving to the next, simplifying operation management but increasing tool changes. For parts with many identical pockets, depth-first saves 15-30% on tool change time. For parts with few deep features, breadth-first is simpler and less error-prone.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:community
**Operations:** roughing, setup

## Related
- [[mastercam-cam-tips-mc-049|Core Rough targets island walls specifically for reduced cycle time]]
- [[mastercam-cam-tips-mc-113|Reduce air cutting by using stock-aware toolpaths and tight containment boundaries]]
- [[mastercam-cam-tips-mc-132|Large-step finishing with barrel cutters reduces passes by 80% on open surface areas]]
- [[mastercam-cam-tips-mc-136|Scallop height versus step-over math differs fundamentally between ball and barrel cutters]]
- [[mastercam-cam-tips-mc-154|Overlapping operations in Swiss Sync Manager maximize spindle utilization]]
