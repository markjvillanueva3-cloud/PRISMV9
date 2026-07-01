---
name: tribal-cat-190
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "post-processor", "coolant", "m-codes", "auxiliary"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-190.md
promoted_at: 2026-06-09T22:31:16.075Z
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
