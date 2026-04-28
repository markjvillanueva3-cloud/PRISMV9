---
id: "cat-072"
title: "Canned Cycle Output for Drilling Operations"
source: "web:catia-docs"
confidence: 90
category: "cam_strategy"
tags: ["catia", "canned-cycle", "drilling", "post-processor", "g-code"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.857Z
---

# Canned Cycle Output for Drilling Operations

Configure the CATIA post-processor to output canned drilling cycles (G81, G83, G84, G73, G76, G85) rather than expanded point-to-point moves. Canned cycles reduce NC program size by 80-90% for hole patterns and are executed more efficiently by the controller. Map each CATIA drilling operation type to the correct cycle: Drill → G81, Peck Drill → G83 (full retract) or G73 (chip break), Tap → G84, Bore → G85/G86, Deep Hole → G83 with large peck. Verify the retract plane (R value) and final depth (Z value) in the output.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:catia-docs
**Operations:** post_processing

## Related
- [[catia-cam-tips-cat-070|Post-Processor Table Customization for Controller Compatibility]]
- [[catia-cam-tips-cat-187|IMS Script Custom Cycles for CATIA Post Processing]]
- [[gibbscam-cam-tips-gc-078|Canned cycle output from post maps GibbsCAM operations to G81/G83/G84]]
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
- [[edgecam-cam-tips-ec-076|Canned Cycle Output for Standard Operations]]
