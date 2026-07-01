---
name: tribal-sc2-208
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["probing", "calibration", "reference-sphere", "stylus", "accuracy"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-208.md
promoted_at: 2026-06-09T22:31:16.705Z
---

# SURFCAM Probe Calibration Cycles in the Post Processor

Include probe calibration cycles in the SURFCAM post processor to ensure measurement accuracy. Calibrate the probe at the start of each shift by probing a reference sphere of known diameter. The calibration determines the probe's effective tip diameter and stylus deflection characteristics. Store calibration data in machine variables and subtract the probe radius from all subsequent measurements. Set the calibration sphere temperature to match the machine environment — a 1°C temperature difference on a 25mm sphere causes 0.3μm diameter change. Recalibrate after any probe crash or stylus replacement.

**Category:** setup
**Confidence:** 0.85
**Source:** web:surfcam-docs
**Operations:** probing

## Related
- [[controller-knowledge-tips-ctrl-084|TNC 640 KinematicsOpt for rotary axis calibration]]
- [[esprit-cam-tips-esp-144|Robot Machining Calibration and TCP Accuracy]]
- [[nx-cam-tips-ext-nx-140|Volumetric Accuracy Compensation]]
- [[powermill-cam-tips-pm-157|Volumetric Accuracy Compensation]]
- [[worknc-cam-tips-wnc-139|WorkNC Robot Calibration — Improving Accuracy with TCP Calibration]]
