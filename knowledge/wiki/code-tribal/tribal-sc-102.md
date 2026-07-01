---
name: tribal-sc-102
category: code-tribal
subdomain: tooling
domain: tribal-knowledge
tags: ["solidcam", "tool-library", "gauge-length", "measurement", "presetter"]
confidence: 91
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-102.md
promoted_at: 2026-05-26T16:07:20.440Z
---

# Tool Library — Define Tool Assemblies with Measured Gauge Lengths

In SolidCAM's Tool Library, always define tools with their actual measured gauge length (tool tip to spindle face) rather than catalog values. Catalog gauge lengths assume a specific holder, but your actual assembly may differ by 5-15mm depending on collet type and pull-stud length. An incorrect gauge length causes Z-axis positioning errors in the G-code. For critical parts, measure each tool assembly on a presetter and update the library entry before each job.

**Category:** tooling
**Confidence:** 91
**Source:** web:solidcam-docs
**Operations:** setup, tool_management

## Related
- [[cimatron-cam-tips-cim-088|Tool Library Management with Presetter Integration]]
- [[tebis-cam-tips-teb-086|Tool Library Management with Physical Measurements]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
