---
name: tribal-ec-218
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["process-capability", "cpk", "probing", "spc"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-218.md
promoted_at: 2026-06-09T22:31:16.213Z
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
