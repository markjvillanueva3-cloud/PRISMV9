---
name: tribal-esp-144
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["robot-machining", "calibration", "tcp", "laser-tracker", "accuracy"]
confidence: 0
source: "web:esprit-docs"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-144.md
promoted_at: 2026-06-09T22:31:16.246Z
---

# Robot Machining Calibration and TCP Accuracy

Robot TCP (Tool Center Point) accuracy is typically 0.5-2mm out of the box, insufficient for machining. ESPRIT integrates with Leica laser tracker and API calibration systems: (1) perform a 50-100 point calibration grid throughout the workspace, (2) ESPRIT imports the error map and applies point-by-point correction to the output program, (3) recalibrate quarterly or after any collision. With calibration, robot machining accuracy improves to 0.05-0.15mm — adequate for trimming, drilling, and roughing but not precision finishing.

**Category:** quality
**Confidence:** 0.78
**Source:** web:esprit-docs

## Related
- [[worknc-cam-tips-wnc-139|WorkNC Robot Calibration — Improving Accuracy with TCP Calibration]]
- [[nx-cam-tips-ext-nx-140|Volumetric Accuracy Compensation]]
- [[powermill-cam-tips-pm-157|Volumetric Accuracy Compensation]]
- [[surfcam-cam-tips-sc2-208|SURFCAM Probe Calibration Cycles in the Post Processor]]
- [[worknc-cam-tips-wnc-184|Digital Twin Cycle Time Calibration — Matching Simulation to Reality]]
