---
name: tribal-sc-114
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["solidcam", "solid-probe", "dimensional-verification", "gdt", "bore-measurement"]
confidence: 89
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-114.md
promoted_at: 2026-06-09T22:31:16.596Z
---

# Solid Probe Dimensional Verification — In-Machine GD&T Checking

Use Solid Probe's dimensional verification cycles to check critical dimensions (bore diameters, face-to-face distances, slot widths) before removing the part from the machine. For bore diameter measurement, use a minimum 3-point probing pattern (120-degree spacing) at two Z-heights to detect both diameter and cylindricity errors. The probe results can be logged to a CSV file on the CNC for SPC analysis. Probing accuracy is typically +-0.005mm — sufficient for most machining tolerances but not a replacement for CMM inspection on critical aerospace dimensions.

**Category:** quality
**Confidence:** 89
**Source:** web:solidcam-docs
**Operations:** probing, inspection

## Related
- [[solidcam-cam-tips-sc-112|Solid Probe Part Alignment — Automated WCS Setup from Raw Stock]]
- [[solidcam-cam-tips-sc-113|Solid Probe Surface Inspection — Mid-Process Quality Gate]]
- [[solidcam-cam-tips-sc-115|Solid Probe Tool Presetting — Check Tool Length Between Operations]]
- [[solidcam-cam-tips-sc-116|Solid Probe WCS Update — Dynamic Offset Correction for Batch Parts]]
- [[solidcam-cam-tips-sc-117|Solid Probe Quality Reporting — Export Measurement Data for Traceability]]
