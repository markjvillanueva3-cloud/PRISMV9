---
name: tribal-sc2-068
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["machine-simulation", "kinematic", "axis-limits", "singularity"]
confidence: 90
source: "web:surfcam-machine-sim"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-068.md
promoted_at: 2026-05-26T16:07:20.562Z
---

# Machine Simulation with Full Kinematic Model

SURFCAM machine simulation (via M-POST) displays the full machine tool including column, spindle head, table, trunnion, and axis motions. This catches issues that toolpath-only simulation misses: axis over-travel, rotary axis limits, singularity positions, and machine-specific collision zones. Load the correct machine model from SURFCAM's library or import a custom model from the machine builder. Always run machine simulation for 5-axis programs before first-article production.

**Category:** setup
**Confidence:** 90
**Source:** web:surfcam-machine-sim
**Operations:** verification, 5_axis

## Related
- [[fusion360-cam-tips-ext-f360-156|Machine Simulation Setup with Kinematic Model]]
- [[mastercam-cam-tips-mc-092|Machine Simulation detects axis over-travel that Verify completely misses]]
- [[bobcad-cam-tips-bc-081|Machine Simulation PRO with Full Kinematic Model]]
- [[surfcam-cam-tips-sc2-219|SURFCAM Simulation Axis Limit Checking for 5-Axis Programs]]
- [[topsolid-cam-tips-ts-065|Machine Kinematics Validation Prevents Axis Limit Violations]]
