---
id: "cat-188"
title: "Multi-Axis Post Processor Rotary Axis Output Configuration"
source: "web:catia-docs"
confidence: 0.9
category: "cam_strategy"
tags: ["catia", "post-processor", "multi-axis", "rotary", "rtcp"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.963Z
---

# Multi-Axis Post Processor Rotary Axis Output Configuration

For 5-axis post processors in CATIA, correctly configure the rotary axis output mode: (1) 'Tool Tip Positioning' (RTCP/TCPM) — controller compensates pivot point offset, output is I J K tool vectors, (2) 'Table-Table' — output is A B C rotary angles, controller does not compensate, CATIA pre-computes the pivot transform, (3) 'Head-Head' — similar to Table-Table but for spindle-rotate machines. Set the machine's pivot point distance and rotary axis directions in the PP table's MACHINE section. Incorrect pivot configuration causes position errors proportional to the tool length — a 200mm tool with 1° axis error produces 3.5mm position error at the tool tip.

**Category:** cam_strategy
**Confidence:** 0.9
**Source:** web:catia-docs
**Operations:** post_processing

## Related
- [[catia-cam-tips-cat-071|Multi-Axis Post-Processor RTCP and TCP Mode Configuration]]
- [[edgecam-cam-tips-ec-075|Multi-Axis Post Processors for 4/5-Axis Machines]]
- [[topsolid-cam-tips-ts-068|Multi-Axis Post Configuration Handles RTCP/TCP]]
- [[catia-cam-tips-cat-025|Multi-Axis Sweeping Lead/Lag Angle for Surface Quality]]
- [[catia-cam-tips-cat-026|Multi-Axis Curve Machining for Edge Trimming and Deburring]]
