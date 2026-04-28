---
id: "cat-190"
title: "CATIA PP Table Coolant and Auxiliary Function Mapping"
source: "web:catia-docs"
confidence: 0.86
category: "cam_strategy"
tags: ["catia", "post-processor", "coolant", "m-codes", "auxiliary"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.965Z
---

# CATIA PP Table Coolant and Auxiliary Function Mapping

Map coolant and auxiliary function M-codes correctly in the CATIA PP table. Standard mappings: COOLNT/FLOOD → M08, COOLNT/MIST → M07, COOLNT/THRU → M88 (or custom), COOLNT/OFF → M09, SPINDL/CLW → M03, SPINDL/CCLW → M04, SPINDL/OFF → M05. For machines with programmable coolant pressure, add custom UDE (User Defined Events) in the manufacturing operation and map them to PP table entries: UDE 'HIGH_PRESSURE_COOLANT' → M51 P1000 (1000 PSI). For machines with chip conveyor, air blast, or through-spindle coolant, define separate M-codes in the PP table's AUX_FUN section and link them to operation-level toggles.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:catia-docs
**Operations:** post_processing

## Related
- [[catia-cam-tips-cat-070|Post-Processor Table Customization for Controller Compatibility]]
- [[catia-cam-tips-cat-071|Multi-Axis Post-Processor RTCP and TCP Mode Configuration]]
- [[catia-cam-tips-cat-072|Canned Cycle Output for Drilling Operations]]
- [[catia-cam-tips-cat-073|APT and CLDATA Output for Third-Party Post Processing]]
- [[catia-cam-tips-cat-074|Sub-Program Generation for Repeated Geometry Patterns]]
