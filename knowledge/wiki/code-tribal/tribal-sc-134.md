---
name: tribal-sc-134
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "wire-edm", "auto-threading", "tabs", "unattended"]
confidence: 86
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-134.md
promoted_at: 2026-06-09T22:31:16.600Z
---

# Wire EDM Auto-Threading and Tab Strategy — Unattended Multi-Cavity Cutting

For unattended wire EDM operation, use SolidCAM's tab (tie) strategy combined with auto-threading. Place tabs on non-critical surfaces to prevent slug drops during multi-cavity cutting. SolidCAM cuts each profile, leaving a 0.3-0.5mm tab, then the wire auto-threads to the next start hole. After all cavities are rough-cut, remove tabs manually and program skim passes. Tab placement rules: position tabs where they are accessible for manual removal, avoid sharp corners, and place them at non-functional surfaces. For dies, place tabs on the scrap side. Enable auto-threading verification — the controller confirms wire threading success before continuing.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:solidcam-docs
**Operations:** wire_edm

## Related
- [[esprit-cam-tips-esp-057|Wire EDM Slug Management for Safe Unattended Operation]]
- [[gibbscam-cam-tips-gc-069|Automatic wire threading enables multi-opening unattended production]]
- [[solidcam-cam-tips-sc-110|Batch Processing — Post-Process Multiple Parts Unattended]]
- [[solidcam-cam-tips-sc-130|Wire EDM Profile Cutting — 2-Axis Contour with Multiple Skim Passes]]
- [[solidcam-cam-tips-sc-131|Wire EDM Taper Cutting — Constant and Variable Angle Profiles]]
