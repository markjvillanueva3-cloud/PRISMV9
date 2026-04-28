---
id: "ec-181"
title: "PCI Automation for Batch Part Processing"
source: "web:edgecam-docs"
confidence: 0.83
category: "automation"
tags: ["pci", "batch-processing", "part-families", "csv-import"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.408Z
---

# PCI Automation for Batch Part Processing

Edgecam's Part Changer Interface (PCI) automates batch processing of similar parts. Define a base program with variable parameters (stock dimensions, feature depths, hole positions). PCI reads a CSV or Excel file containing per-part values and generates individual programs automatically. For families of 50+ parts with similar geometry, PCI reduces programming time from hours to minutes. Configure the output folder structure: one subfolder per part with NC code, setup sheet, and tool list.

**Category:** automation
**Confidence:** 0.83
**Source:** web:edgecam-docs
**Operations:** all

## Related
- [[surfcam-cam-tips-sc2-138|SURFCAM Traditional Macro System for Batch Processing]]
- [[edgecam-cam-tips-ec-061|Custom Strategy Development with PCI Macros]]
- [[edgecam-cam-tips-ec-114|PCI Macro Language for Custom Automation]]
- [[edgecam-cam-tips-ec-118|Custom Cycle Creation for Repeated Operations]]
- [[edgecam-cam-tips-ec-058|Batch Processing Multiple Parts Overnight]]
