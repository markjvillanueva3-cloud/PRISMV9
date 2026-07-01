---
name: tribal-f360-197
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["fusion360", "spc", "cpk", "process-capability", "dimensional-control"]
confidence: 0
source: "web:autodesk-forum"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-197.md
promoted_at: 2026-06-09T22:31:16.299Z
---

# Statistical Process Control Setup from Fusion Data

Export dimensional data from Fusion's Inspection workspace to build SPC charts for critical features. Track Cpk over production runs by measuring the same features on each part using the inspection plan. Target Cpk > 1.33 for standard features and > 1.67 for safety-critical features. When Cpk drops below target, investigate: tool wear (progressive drift in mean), thermal growth (cyclical drift), fixture shift (sudden mean jump), or material variation (increased spread). In Fusion, adjust the CAM parameters based on SPC trends: increase stock-to-leave by the mean drift amount, add spring passes for features with high variability, or reduce the stepover for surface finish features showing SPC excursions.

**Category:** quality
**Confidence:** 0.84
**Source:** web:autodesk-forum
**Operations:** general

## Related
- [[fusion360-cam-tips-ext-f360-200|Process Capability Prediction from CAM Simulation]]
- [[edgecam-cam-tips-ec-218|Process Capability Study Setup from Edgecam Programs]]
- [[esprit-cam-tips-esp-197|Statistical Process Capability Monitoring with ESPRIT Data Export]]
- [[bobcad-cam-tips-bc-200|Process Capability Monitoring for BobCAD Production Programs]]
- [[catia-cam-tips-cat-213|Monte Carlo Process Capability Estimation for CATIA Machining]]
