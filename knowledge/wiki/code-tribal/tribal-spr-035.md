---
name: tribal-spr-035
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["probing", "in-machine", "verification", "wcs"]
confidence: 0
source: "web:sprutcam-docs"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-035.md
promoted_at: 2026-06-09T22:31:16.627Z
---

# Probing Cycles for In-Machine Verification

Program probing cycles in SprutCAM using the probe as a tool. Typical workflow: (1) probe stock datum before machining (WCS alignment), (2) probe between operations to verify critical dimensions, (3) probe finished part before unclamping. Use SprutCAM's probing macro templates for common patterns: single point, bore center, boss center, web thickness. Output probe results to controller variables for automatic offset adjustment.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:sprutcam-docs
**Operations:** setup

## Related
- [[cimatron-cam-tips-cim-094|Probing Integration for In-Process Verification]]
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[camworks-cam-tips-cw-119|Verification Probing — Final Part Inspection On-Machine]]
- [[camworks-cam-tips-cw-196|Automated Probing Cycles — First-Part Verification Before Production]]
- [[camworks-cam-tips-cw-199|Fixture Probing — Work Coordinate System Alignment from Part Features]]
