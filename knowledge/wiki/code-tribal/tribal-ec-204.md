---
name: tribal-ec-204
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["custom-cycle", "probing", "in-process-measurement", "quality"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-204.md
promoted_at: 2026-06-09T22:31:16.209Z
---

# Custom Probing Cycle for In-Process Measurement

Create custom probing cycles in Edgecam for in-process measurement that goes beyond standard probe routines. Define multi-point measurement patterns: bore circularity (8-point), flatness (grid pattern), parallelism (two-surface comparison). Program the probe to write measured values to macro variables, calculate deviations, and output results to a data file (DPRNT or equivalent). Add conditional logic: if deviation exceeds tolerance, execute a correction pass with tool-offset adjustment.

**Category:** cam_strategy
**Confidence:** 0.83
**Source:** web:edgecam-docs
**Operations:** probing

## Related
- [[controller-knowledge-tips-ctrl-004|Fanuc Macro B custom probing cycles]]
- [[catia-cam-tips-cat-080|On-Machine Verification Probing Reduces Setup Iterations]]
- [[edgecam-cam-tips-ec-202|Custom Drilling Cycle for Step-Bore Operations]]
- [[edgecam-cam-tips-ec-203|Custom Thread Milling Cycle with Variable Pitch]]
- [[edgecam-cam-tips-ec-205|Custom Tapping Cycle with Torque Monitoring]]
