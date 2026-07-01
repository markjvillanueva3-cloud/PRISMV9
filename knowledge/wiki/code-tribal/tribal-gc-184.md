---
name: tribal-gc-184
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "composite", "honeycomb", "ultrasonic", "5-axis"]
confidence: 79
source: "web:gibbscam-forum"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-184.md
promoted_at: 2026-06-09T22:31:16.360Z
---

# GibbsCAM honeycomb core machining uses ultrasonic knife tools on 5-axis routers

For Nomex or aluminum honeycomb core machining in GibbsCAM, program 5-axis trimming with an ultrasonic knife or diamond-coated disk cutter. The tool must remain tangent to the core surface while the 5-axis motion follows the contoured shape. Set the tool axis perpendicular to the core surface and enable 'Surface Normal' tool orientation mode. Cut speed for ultrasonic knives is 10-30 m/min with minimal feed force. For complex double-curvature cores, GibbsCAM's 5-axis flow-line strategy follows the surface contour while maintaining constant contact angle. Program a vacuum fixture to hold the lightweight core — mechanical clamps crush the delicate cells.

**Category:** cam_strategy
**Confidence:** 79
**Source:** web:gibbscam-forum

## Related
- [[catia-cam-tips-cat-207|Honeycomb Core Machining with Ultrasonic-Assisted Cutting in CATIA]]
- [[gibbscam-cam-tips-gc-031|Swarf milling uses the side of the cutter for ruled surface finishing]]
- [[gibbscam-cam-tips-gc-032|Multi-surface 5-axis machining handles complex blended geometry transitions]]
- [[gibbscam-cam-tips-gc-033|Port machining strategy programs internal passages with collision avoidance]]
- [[gibbscam-cam-tips-gc-034|MultiBlade module automates impeller and blisk programming workflow]]
