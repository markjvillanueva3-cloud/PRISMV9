---
name: tribal-ctrl-049
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["post-processor", "cam", "cross-controller", "selection-guide"]
confidence: 95
source: "controller:cross_reference_guide"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-049.md
promoted_at: 2026-05-26T16:07:20.141Z
---

# Cross-controller post processor selection guide

Critical post-processor matching: Fanuc-based machines (DN Solutions, Feeler, YCM, Hartford, Brother) — use brand-specific Fanuc post, NOT generic. Siemens-based machines (DMG MORI CELOS, Chiron, GROB, Heller, Index, EMAG, Spinner) — use Siemens 840D post with OEM-specific header. Okuma — MUST use Okuma-specific post (not Fanuc/Siemens). Mazak — use MAZATROL or EIA post, not generic Fanuc. Heidenhain — use Klartext or ISO post depending on CAM output format.

**Category:** programming
**Confidence:** 95
**Source:** controller:cross_reference_guide

## Related
- [[controller-knowledge-tips-ctrl-078|SINUMERIK Post-Processor Configuration Essentials]]
- [[bobcad-cam-tips-bc-130|BobCAD V36 Advanced Toolpath Simulation with G-Code Verification]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[camworks-cam-tips-cw-086|Multi-Axis Post Processors — Handle Rotary Axis Output Correctly]]
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
