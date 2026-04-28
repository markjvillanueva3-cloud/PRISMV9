---
id: "sc-115"
title: "Solid Probe Tool Presetting — Check Tool Length Between Operations"
source: "web:solidcam-docs"
confidence: 87
category: "quality"
tags: ["solidcam", "solid-probe", "tool-presetting", "breakage-detection", "sister-tool"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.752Z
---

# Solid Probe Tool Presetting — Check Tool Length Between Operations

SolidCAM Solid Probe includes tool presetting cycles that measure tool length and diameter on the machine's tool presetter (laser or touch type). Insert a tool presetting check between heavy roughing passes to detect tool breakage or excessive wear. Set a breakage threshold of 0.5mm length change and a wear threshold of 0.05mm. On breakage detection, the cycle can trigger a tool change to the sister tool (same tool type in a backup pocket) and continue machining automatically without operator intervention.

**Category:** quality
**Confidence:** 87
**Source:** web:solidcam-docs
**Operations:** probing, tool_management

## Related
- [[solidcam-cam-tips-sc-112|Solid Probe Part Alignment — Automated WCS Setup from Raw Stock]]
- [[solidcam-cam-tips-sc-113|Solid Probe Surface Inspection — Mid-Process Quality Gate]]
- [[solidcam-cam-tips-sc-114|Solid Probe Dimensional Verification — In-Machine GD&T Checking]]
- [[solidcam-cam-tips-sc-116|Solid Probe WCS Update — Dynamic Offset Correction for Batch Parts]]
- [[solidcam-cam-tips-sc-117|Solid Probe Quality Reporting — Export Measurement Data for Traceability]]
