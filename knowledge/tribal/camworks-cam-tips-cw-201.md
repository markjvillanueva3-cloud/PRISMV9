---
id: "cw-201"
title: "Probing Data Export for SPC — Connecting Machine Measurement to Quality Systems"
source: "web:camworks-docs"
confidence: 88
category: "cam_strategy"
tags: ["camworks", "probing", "spc", "data-export", "quality-system"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.801Z
---

# Probing Data Export for SPC — Connecting Machine Measurement to Quality Systems

Export probing results from the CNC controller to SPC software (QC-CALC, InfinityQS, Minitab) for statistical analysis. Most probing macros can write measurement results to a network file or serial port in CSV format. Configure the CAMWorks post processor to include data export commands (DPRNT on Fanuc, MSG on Siemens) after each measurement cycle. This creates a continuous quality data stream from the machine to the quality department without manual data entry, enabling real-time SPC charts and immediate reaction to out-of-control conditions.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** probing, general

## Related
- [[camworks-cam-tips-cw-119|Verification Probing — Final Part Inspection On-Machine]]
- [[camworks-cam-tips-cw-115|Setup Probing — Automatic Work Coordinate Establishment]]
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[camworks-cam-tips-cw-117|In-Process Inspection — Verify Critical Dimensions Mid-Program]]
- [[camworks-cam-tips-cw-118|Part Alignment Probing — Compensate for Misaligned Raw Stock]]
