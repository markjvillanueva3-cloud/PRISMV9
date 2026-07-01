---
name: tribal-wnc-139
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["worknc-robot", "calibration", "tcp", "accuracy", "kinematic"]
confidence: 87
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-139.md
promoted_at: 2026-06-09T22:31:16.819Z
---

# WorkNC Robot Calibration — Improving Accuracy with TCP Calibration

Robot machining accuracy depends on TCP (Tool Center Point) calibration quality. WorkNC Robot supports: 4-point TCP calibration (touch a reference point from 4 orientations), 6-point calibration (adds tool direction), and full kinematic calibration using laser tracker or ball-bar. For machining applications, perform full kinematic calibration — it corrects joint zero offsets, link lengths, and coupling errors. Recalibrate after any robot collision, joint replacement, or quarterly as a minimum. Without calibration, robots can have 2-5mm TCP error, making machining impossible.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:worknc-docs
**Operations:** general

## Related
- [[esprit-cam-tips-esp-144|Robot Machining Calibration and TCP Accuracy]]
- [[nx-cam-tips-ext-nx-140|Volumetric Accuracy Compensation]]
- [[powermill-cam-tips-pm-157|Volumetric Accuracy Compensation]]
- [[surfcam-cam-tips-sc2-208|SURFCAM Probe Calibration Cycles in the Post Processor]]
- [[worknc-cam-tips-wnc-184|Digital Twin Cycle Time Calibration — Matching Simulation to Reality]]
