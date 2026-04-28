---
id: "teb-025"
title: "Stock Island Detection Prevents Collisions with Unmachined Areas"
source: "web:tebis-docs"
confidence: 87
category: "roughing"
tags: ["stock-island", "collision", "safety", "detection"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.239Z
---

# Stock Island Detection Prevents Collisions with Unmachined Areas

Tebis roughing detects stock islands — areas of material that become isolated during machining — and modifies the toolpath to handle them safely. Islands can tip or vibrate if not secured. Enable island detection in the roughing parameters. The system either (1) machines islands from the outside in to maintain support, or (2) warns the programmer to add tabs or holding features. For features taller than 3xD, always machine from outside in.

**Category:** roughing
**Confidence:** 87
**Source:** web:tebis-docs
**Operations:** roughing

## Related
- [[catia-cam-tips-cat-053|Collision Detection Clearance Margins for Safety]]
- [[camworks-cam-tips-cw-053|5-Axis Collision Avoidance — Automatic Tool Tilting Around Obstacles]]
- [[cimatron-cam-tips-cim-018|Simulation Verification Before Post-Processing]]
- [[powermill-cam-tips-pm-025|Machine Simulation Validates Full Kinematic Chain]]
- [[powermill-cam-tips-pm-197|Collision with Full Assembly Safety Check]]
