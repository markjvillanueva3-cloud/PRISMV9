---
name: tribal-sc2-186
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["cpk", "process-capability", "dimensional", "statistical", "aerospace"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-186.md
promoted_at: 2026-06-09T22:31:16.700Z
---

# Process Capability Index from SURFCAM Dimensional Outputs

After machining a batch of parts programmed in SURFCAM, calculate the process capability index Cpk from measured dimensions. Cpk = min[(USL - μ)/(3σ), (μ - LSL)/(3σ)] where USL/LSL are spec limits. A Cpk > 1.33 indicates the process is capable. If Cpk < 1.0, the SURFCAM program needs adjustment — typically tighter finishing tolerances, additional spring passes, or tool deflection compensation. Track Cpk over time to detect tool wear trends before they produce scrap. Target Cpk > 1.67 for critical aerospace dimensions.

**Category:** quality
**Confidence:** 0.86
**Source:** web:surfcam-docs
**Operations:** finishing

## Related
- [[esprit-cam-tips-esp-197|Statistical Process Capability Monitoring with ESPRIT Data Export]]
- [[bobcad-cam-tips-bc-200|Process Capability Monitoring for BobCAD Production Programs]]
- [[catia-cam-tips-cat-213|Monte Carlo Process Capability Estimation for CATIA Machining]]
- [[cimatron-cam-tips-cim-044|Cpk Prediction for Mold Cavity Dimensions]]
- [[edgecam-cam-tips-ec-218|Process Capability Study Setup from Edgecam Programs]]
