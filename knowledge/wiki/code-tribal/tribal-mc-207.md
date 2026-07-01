---
name: tribal-mc-207
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "retract-height", "incremental", "absolute", "linking", "cycle-time"]
confidence: 86
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-207.md
promoted_at: 2026-06-09T22:31:16.446Z
---

# Retract height optimization uses incremental mode to minimize vertical travel on variable-height parts

Mastercam offers two retract modes: Absolute (retracts to a fixed Z-height) and Incremental (retracts a fixed distance above the current cut). For parts with significant height variation (mold cavities, aerospace pockets), Absolute retract wastes time because the tool travels to the same high Z-level even when the next cut is on a shallow feature. Incremental retract (set to 2–5 mm above the surface) keeps the tool close to the work regardless of local height. On a mold cavity with 100 mm depth variation, switching from Absolute to Incremental retract saves 1–3 seconds per retract move — across 500 passes, this totals 8–25 minutes. Set Incremental retract in the Linking Parameters dialog. Combine with Safe Zone or Clearance Plane settings that prevent collision with fixtures during long lateral moves between widely separated features.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:mastercam-docs
**Operations:** roughing, finishing

## Related
- [[mastercam-cam-tips-mc-296|Mastercam Dynamic Motion micro-retract height tuning minimizes air-cut time in deep pocket roughing]]
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
- [[mastercam-cam-tips-mc-049|Core Rough targets island walls specifically for reduced cycle time]]
- [[mastercam-cam-tips-mc-113|Reduce air cutting by using stock-aware toolpaths and tight containment boundaries]]
- [[mastercam-cam-tips-mc-114|Toolpath linking parameters control retract height, lead-in, and lead-out strategy]]
