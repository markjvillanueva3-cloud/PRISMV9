---
name: tribal-bc-046
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["threading", "infeed", "spring-pass", "g76", "multi-pass"]
confidence: 90
source: "web:bobcad-threading"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-046.md
promoted_at: 2026-05-26T16:07:19.781Z
---

# Threading with Multi-Pass Infeed and Spring Passes

BobCAD threading supports radial, flank (29°/30°), modified flank, and alternating flank infeed methods. For external threads in steel, use modified flank infeed for best chip control. Set passes based on pitch: 4-6 for fine (<1.5mm), 8-12 for coarse (>2mm). Always include 2 spring passes at final depth. BobCAD outputs the correct canned cycle (G76 Fanuc, G33 Siemens) with all infeed parameters based on the selected method.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:bobcad-threading
**Operations:** threading

## Related
- [[surfcam-cam-tips-sc2-048|Threading with Multi-Pass Infeed Strategies]]
- [[camworks-cam-tips-cw-066|Threading — Multiple Passes with Decreasing Depth for Clean Threads]]
- [[edgecam-cam-tips-ec-039|Threading with Multiple Pass Strategy]]
- [[fusion360-cam-tips-ext-f360-127|Threading Cycle with Spring Pass]]
- [[gibbscam-cam-tips-gc-056|Threading with multiple passes uses decreasing infeed for surface quality]]
