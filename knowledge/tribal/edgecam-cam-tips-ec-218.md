---
id: "ec-218"
title: "Process Capability Study Setup from Edgecam Programs"
source: "web:edgecam-docs"
confidence: 0.85
category: "quality"
tags: ["process-capability", "cpk", "probing", "spc"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.437Z
---

# Process Capability Study Setup from Edgecam Programs

Use Edgecam probing routines to automate Cp/Cpk data collection for process capability studies. Program probe measurements at all critical dimensions after machining. Output measured values to a CSV file using DPRNT (Fanuc) or custom data output M-codes. Collect 30+ samples (per AIAG guidelines) for initial capability study. Calculate Cp = (USL - LSL) / 6σ and Cpk = min((USL - x̄) / 3σ, (x̄ - LSL) / 3σ). Target Cpk ≥ 1.33 for standard and ≥ 1.67 for safety-critical features.

**Category:** quality
**Confidence:** 0.85
**Source:** web:edgecam-docs
**Operations:** probing

## Related
- [[esprit-cam-tips-esp-197|Statistical Process Capability Monitoring with ESPRIT Data Export]]
- [[fusion360-cam-tips-ext-f360-197|Statistical Process Control Setup from Fusion Data]]
- [[bobcad-cam-tips-bc-200|Process Capability Monitoring for BobCAD Production Programs]]
- [[catia-cam-tips-cat-213|Monte Carlo Process Capability Estimation for CATIA Machining]]
- [[cimatron-cam-tips-cim-044|Cpk Prediction for Mold Cavity Dimensions]]
