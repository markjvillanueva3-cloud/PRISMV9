---
name: tribal-f360-152
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "through-spindle-coolant", "deep-drilling", "chip-flushing", "tsc"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-152.md
promoted_at: 2026-06-09T22:31:16.289Z
---

# Through-Spindle Coolant for Deep Hole Drilling

Configure through-spindle coolant (TSC) in Fusion by setting the Coolant mode to 'Through Tool' in the operation parameters. TSC is essential for drilling depths beyond 5x diameter — the high-pressure coolant (40-70 bar) flushes chips from the cutting zone and cools the drill tip. Without TSC at these depths, chips pack in the flutes, causing drill breakage. If TSC is not available, reduce the peck depth to 0.5x diameter and increase the dwell at the bottom (0.5 seconds) to allow the drill to clear chips. Feed rate for TSC deep drilling: start at 75% of the manufacturer's recommendation and increase based on chip formation quality.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:fusion360-docs
**Operations:** drilling

## Related
- [[fusion360-cam-tips-ext-f360-151|Pilot Hole Strategy for Deep Holes]]
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
- [[fusion360-cam-tips-ext-f360-042|Rest Machining Adaptive with Tight Tolerance Overlap]]
- [[fusion360-cam-tips-ext-f360-043|Separate Radial and Axial Stock-to-Leave for Adaptive]]
