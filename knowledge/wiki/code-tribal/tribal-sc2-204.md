---
name: tribal-sc2-204
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["probing", "in-machine-inspection", "bore-measurement", "pass-fail", "corrective"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-204.md
promoted_at: 2026-06-09T22:31:16.704Z
---

# SURFCAM Post-Machining Probing for In-Machine Inspection

Program SURFCAM probing operations after finishing passes to verify critical dimensions without removing the part from the machine. Probe bores, bosses, and faces to compare measured dimensions against nominal. The post processor generates probe cycles with pass/fail logic — if a dimension exceeds tolerance, the program can trigger a corrective finishing pass with updated tool offsets. For critical bore diameters, probe at 4 points (0°, 90°, 180°, 270°) to detect roundness error. Log all probe results to a CSV file via the machine's macro variables.

**Category:** quality
**Confidence:** 0.87
**Source:** web:surfcam-docs
**Operations:** probing, finishing

## Related
- [[bobcad-cam-tips-bc-081|Machine Simulation PRO with Full Kinematic Model]]
- [[camworks-cam-tips-cw-115|Setup Probing — Automatic Work Coordinate Establishment]]
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[camworks-cam-tips-cw-117|In-Process Inspection — Verify Critical Dimensions Mid-Program]]
- [[camworks-cam-tips-cw-118|Part Alignment Probing — Compensate for Misaligned Raw Stock]]
