---
name: tribal-mc-271
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "solidworks", "configurations", "variants", "family-of-parts", "machine-group"]
confidence: 81
source: "web:mastercam-forum"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-271.md
promoted_at: 2026-06-09T22:31:16.462Z
---

# Mastercam for SolidWorks configurations enable machining multiple part variants from a single setup

When a SolidWorks part has multiple configurations (e.g., left-hand and right-hand variants, or different bolt-hole patterns), MCAM-SW can reference each configuration as a separate Machine Group. Create one Machine Group per configuration, and the toolpaths in each group reference the correct geometry variant. Shared operations (like face milling the top surface) can be copied between groups and will adapt to the configuration-specific geometry. This approach is far more efficient than maintaining separate Mastercam files for each variant. When posting, each Machine Group generates its own NC file. Use this for family-of-parts manufacturing where 80% of the machining is identical and only hole patterns or pocket depths vary between variants.

**Category:** cam_strategy
**Confidence:** 81
**Source:** web:mastercam-forum
**Operations:** general

## Related
- [[camworks-cam-tips-cw-057|Configuration Management — Separate CAM Setups per SOLIDWORKS Config]]
- [[camworks-cam-tips-cw-158|SOLIDWORKS Configurations — One Model, Multiple CAM Setups]]
- [[solidcam-cam-tips-sc-099|Configuration Management — Separate CAM Projects per SolidWorks Configuration]]
- [[mastercam-cam-tips-mc-141|Core/cavity split machining uses separate machine groups for each mold half]]
- [[mastercam-cam-tips-mc-200|Machine group properties define stock shape, material, and coordinate system for all contained operations]]
