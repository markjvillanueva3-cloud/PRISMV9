---
name: tribal-sc-073
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "3plus2", "auto-indexing", "undercuts", "turbo-hsr"]
confidence: 88
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-073.md
promoted_at: 2026-06-09T22:31:16.588Z
---

# Auto 3+2 in Turbo HSR/HSM — Automatic Undercut Access

Enable Auto 3+2 in Turbo HSR or Turbo HSM to automatically detect undercut regions that require tilted tool orientations. SolidCAM calculates the minimum number of indexed orientations needed to reach all surfaces, then generates 3-axis toolpaths within each orientation. Set the minimum undercut depth threshold to 0.5mm to prevent the system from creating unnecessary orientations for shallow features. Each auto-detected orientation adds a tool reorientation, so balance coverage against cycle time.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:solidcam-docs
**Operations:** 3plus2, roughing, finishing

## Related
- [[solidcam-cam-tips-sc-058|Turbo HSR Hybrid Rib Roughing — Single Operation for Thin Ribs]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
