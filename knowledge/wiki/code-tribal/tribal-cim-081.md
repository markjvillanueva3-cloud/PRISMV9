---
name: tribal-cim-081
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["multi-cavity", "copy", "replication", "efficiency"]
confidence: 0
source: "web:cimatron-docs"
promoted_from: knowledge/tribal/cimatron-cam-tips-cim-081.md
promoted_at: 2026-06-09T22:31:16.102Z
---

# Cavity and Insert Matching for Multi-Cavity Molds

For multi-cavity molds, program one cavity completely, then use Cimatron's 'Copy to Position' to replicate toolpaths to all cavity locations. The system adjusts WCS and rapid moves for each instance. Verify each copy in simulation — different cavity orientations may require modified approach/retract moves. For identical cavities, this reduces programming to 1/N of single-cavity effort.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:cimatron-docs
**Operations:** setup

## Related
- [[cimatron-cam-tips-cim-185|Multi-Cavity Copy with Verification]]
- [[powermill-cam-tips-pm-172|Multi-Cavity Copy with Simulation Verify]]
- [[nx-cam-tips-ext-nx-175|Multi-Cavity Copy with ISV Verification]]
- [[sprutcam-cam-tips-spr-172|Multi-Cavity Copy and Verify]]
- [[bobcad-cam-tips-bc-158|BobCAD Wire EDM Multi-Cavity Optimization with Common Start Holes]]
