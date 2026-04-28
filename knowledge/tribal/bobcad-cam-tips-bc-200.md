---
id: "bc-200"
title: "Process Capability Monitoring for BobCAD Production Programs"
source: "web:bobcad-docs"
confidence: 0.85
category: "quality"
tags: ["cpk", "process-capability", "control-charts", "tool-wear", "compensation"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.613Z
---

# Process Capability Monitoring for BobCAD Production Programs

Track Cpk (process capability index) for dimensions produced by BobCAD programs in production. Cpk = min[(USL-μ)/(3σ), (μ-LSL)/(3σ)]. Target Cpk >1.33 for general machining, >1.67 for aerospace. If Cpk <1.0, adjust the BobCAD program: add spring passes, apply tool deflection compensation, or tighten finishing tolerances. Sample 5 parts every 25 and plot X-bar/R control charts. Progressive Cpk decline indicates tool wear — schedule tool changes when Cpk drops below 1.5. Feed Cpk data back into BobCAD as tool diameter compensation: typically -0.005mm per 50 parts for carbide end mills.

**Category:** quality
**Confidence:** 0.85
**Source:** web:bobcad-docs
**Operations:** finishing

## Related
- [[catia-cam-tips-cat-213|Monte Carlo Process Capability Estimation for CATIA Machining]]
- [[cimatron-cam-tips-cim-044|Cpk Prediction for Mold Cavity Dimensions]]
- [[edgecam-cam-tips-ec-218|Process Capability Study Setup from Edgecam Programs]]
- [[esprit-cam-tips-esp-197|Statistical Process Capability Monitoring with ESPRIT Data Export]]
- [[fusion360-cam-tips-ext-f360-197|Statistical Process Control Setup from Fusion Data]]
