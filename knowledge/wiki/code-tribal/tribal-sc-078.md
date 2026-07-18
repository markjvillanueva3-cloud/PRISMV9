---
name: tribal-sc-078
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "turning", "wiper-insert", "roughing", "surface-finish"]
confidence: 86
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-078.md
promoted_at: 2026-06-09T22:31:16.589Z
---

# Turning Roughing — Use Wiper Insert Geometry for Better Surface Direct from Rough

When using SolidCAM Turning roughing with wiper-geometry inserts (W-suffix in ISO designation), increase the feed rate by 50-80% compared to standard inserts while maintaining the same surface finish. Set the nose radius compensation to the wiper flat length, not the standard corner radius. SolidCAM's turning simulation correctly models wiper geometry only when the insert profile is defined in the tool library with the actual wiper flat dimensions.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:solidcam-docs
**Operations:** turning_roughing

## Related
- [[solidcam-cam-tips-sc-079|Turning Finishing — Constant Surface Speed Transition Zone]]
- [[solidcam-cam-tips-sc-167-2|Chance-Constrained with iMachining Advantage]]
- [[solidcam-cam-tips-sc-172-2|HSR/HSM 3D Finishing Strategies]]
- [[solidcam-cam-tips-sc-181-2|Feature Recognition for Drilling Automation]]
- [[catia-cam-tips-cat-154|CATIA Lathe Roughing with Wiper Insert Geometry]]
