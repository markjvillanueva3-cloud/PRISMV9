---
name: tribal-ec-202
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["custom-cycle", "step-bore", "macro", "drilling"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-202.md
promoted_at: 2026-06-09T22:31:16.208Z
---

# Custom Drilling Cycle for Step-Bore Operations

Create a custom cycle in Edgecam for step-bore operations that combine multiple diameters in a single tool call. Define the cycle parameters: bore diameters (D1, D2, D3), depths (Z1, Z2, Z3), and feed rates per diameter. The custom cycle generates: rapid to Z_clear, feed to Z1 at F1, bore to D1, rapid to Z_clear, feed to Z2 at F2, bore to D2, etc. Store as a macro (G65 call) so the CNC executes a single program line per step-bore — reducing program size and edit complexity.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:edgecam-docs
**Operations:** drilling, boring

## Related
- [[controller-knowledge-tips-ctrl-004|Fanuc Macro B custom probing cycles]]
- [[edgecam-cam-tips-ec-203|Custom Thread Milling Cycle with Variable Pitch]]
- [[edgecam-cam-tips-ec-204|Custom Probing Cycle for In-Process Measurement]]
- [[edgecam-cam-tips-ec-205|Custom Tapping Cycle with Torque Monitoring]]
- [[esprit-cam-tips-esp-179|Custom Cycle Integration with User-Defined G-Code Blocks]]
