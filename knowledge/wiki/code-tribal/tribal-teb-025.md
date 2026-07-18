---
name: tribal-teb-025
category: code-tribal
subdomain: roughing
domain: tribal-knowledge
tags: ["stock-island", "collision", "safety", "detection"]
confidence: 87
source: "web:tebis-docs"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-025.md
promoted_at: 2026-06-09T22:31:16.712Z
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
