---
name: tribal-sc-112
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["solidcam", "solid-probe", "part-alignment", "wcs", "6dof"]
confidence: 90
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-112.md
promoted_at: 2026-05-26T16:07:20.444Z
---

# Solid Probe Part Alignment — Automated WCS Setup from Raw Stock

Use SolidCAM Solid Probe's part alignment cycles to automatically establish the WCS (Work Coordinate System) from raw stock. A typical alignment sequence: probe X-face, probe Y-face, probe Z-face, then probe a bore or boss for rotational alignment. This 4-touch sequence establishes 6-DOF (position + rotation) alignment accurate to the probe system's repeatability (typically +-0.002mm). Output the alignment results to a controller variable block so the CNC stores the offsets in the active work offset register (G54-G59).

**Category:** quality
**Confidence:** 90
**Source:** web:solidcam-docs
**Operations:** probing, setup

## Related
- [[solidcam-cam-tips-sc-113|Solid Probe Surface Inspection — Mid-Process Quality Gate]]
- [[solidcam-cam-tips-sc-114|Solid Probe Dimensional Verification — In-Machine GD&T Checking]]
- [[solidcam-cam-tips-sc-115|Solid Probe Tool Presetting — Check Tool Length Between Operations]]
- [[solidcam-cam-tips-sc-116|Solid Probe WCS Update — Dynamic Offset Correction for Batch Parts]]
- [[solidcam-cam-tips-sc-117|Solid Probe Quality Reporting — Export Measurement Data for Traceability]]
