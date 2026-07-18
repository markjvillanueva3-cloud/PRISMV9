---
name: tribal-spr-007
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["waterjet", "cutting", "corner-speed", "pierce"]
confidence: 0
source: "web:sprutcam-tutorials"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-007.md
promoted_at: 2026-06-09T22:31:16.620Z
---

# Waterjet Cutting Path Optimization

SprutCAM's waterjet module supports abrasive and pure water modes. For abrasive cutting: reduce speed at corners (60% of straight-line speed for 90° corners, 40% for acute angles) to prevent taper and lag. Set 'Pierce Type' to 'Dynamic' for thick materials — this ramps pressure from low to operating pressure over 2-3 seconds, preventing blowout on the entry side.

**Category:** cam_strategy
**Confidence:** 0.83
**Source:** web:sprutcam-tutorials
**Operations:** specialty

## Related
- [[sprutcam-cam-tips-spr-015|Plasma Cutting with THC (Torch Height Control)]]
- [[bobcad-cam-tips-bc-192|BobCAD Composite Waterjet Trim Integration]]
- [[edgecam-cam-tips-ec-167|Composite Waterjet Trimming Toolpath from Edgecam]]
- [[surfcam-cam-tips-sc2-175|SURFCAM Composite Edge Trimming with Waterjet Integration]]
- [[sprutcam-cam-tips-spr-008|Laser Cutting with Kerf Compensation]]
