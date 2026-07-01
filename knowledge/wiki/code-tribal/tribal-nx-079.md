---
name: tribal-nx-079
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["siemens-nx", "centerline-drilling", "peck-depth", "deep-hole", "chip-evacuation"]
confidence: 86
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-079.md
promoted_at: 2026-06-09T22:31:16.482Z
---

# Centerline Drilling with Controlled Peck Depth Reduction

In NX Centerline Drilling, enable progressive peck depth reduction for deep holes (L/D > 5) by setting the First Peck to 3x diameter and the Reduction Factor to 0.7. NX automatically shortens each subsequent peck to account for increasing chip evacuation difficulty. Set the dwell time to 0.5 seconds at full depth for spot-facing operations. Use the Minimum Peck parameter (typically 0.5 mm) to prevent excessively short pecks near the bottom that produce no meaningful chip breakage.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:siemens-nx-docs
**Operations:** drilling, turning

## Related
- [[mastercam-cam-tips-mc-163|Peck depth optimization balances chip evacuation time against total drill cycle time]]
- [[camworks-cam-tips-cw-099|Peck Drilling — Deep Hole Chip Evacuation with Full Retract]]
- [[edgecam-cam-tips-ec-159|BTA Drilling Programming for Large Diameter Deep Holes]]
- [[fusion360-cam-tips-ext-f360-150|Peck Drilling Depth-to-Diameter Guidelines]]
- [[gibbscam-cam-tips-gc-149|Swiss-type low-pressure coolant nozzle positioning affects chip evacuation in deep bores]]
