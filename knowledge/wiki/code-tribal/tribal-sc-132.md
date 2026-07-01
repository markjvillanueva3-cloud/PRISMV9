---
name: tribal-sc-132
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "wire-edm", "4-axis", "uv-axes", "ruled-surface"]
confidence: 87
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-132.md
promoted_at: 2026-06-09T22:31:16.599Z
---

# Wire EDM 4-Axis — Independent Upper and Lower Contour Programming

4-axis wire EDM in SolidCAM programs independent upper (UV) and lower (XY) contours that the wire interpolates between. The upper guide follows one profile while the lower guide follows a different profile, creating ruled surfaces between them. Use 4-axis mode for die clearance angles, extrusion profiles with land-and-relief geometry, and progressive die punches with shear angles. Define the synchronization method: by segment (matching segment counts) or by percentage (proportional travel). Verify the toolpath with SolidCAM's wire EDM simulation, which shows the actual wire shape through the workpiece cross-section.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:solidcam-docs
**Operations:** wire_edm

## Related
- [[solidcam-cam-tips-sc-161-2|Wiener Process for Stochastic iMachining Wear]]
- [[solidcam-cam-tips-sc-164-2|BMA for Multi-Material Tool Life]]
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[solidcam-cam-tips-sc-130|Wire EDM Profile Cutting — 2-Axis Contour with Multiple Skim Passes]]
- [[solidcam-cam-tips-sc-131|Wire EDM Taper Cutting — Constant and Variable Angle Profiles]]
