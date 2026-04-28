---
id: "cat-189"
title: "Post Processor Testing with CLFile Comparison"
source: "web:dassault-forum"
confidence: 0.85
category: "cam_strategy"
tags: ["catia", "post-processor", "testing", "clfile", "comparison"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.964Z
---

# Post Processor Testing with CLFile Comparison

Validate CATIA post processor modifications by comparing output against a known-good reference. Process the same Manufacturing Program through both old and new PP versions, then diff the G-code outputs. Focus on: (1) line count changes (missing/extra blocks), (2) coordinate value differences (rounding, decimal places), (3) modal G-code state changes (G90/G91, G54-G59), (4) tool change and program structure changes. CATIA stores the CLFile (cutter location file) in the CATProcess — compare CL data to verify the PP is interpreting all events. Use CATIA's 'NC Output Comparison' tool or external diff tools. Always test with a program containing all operation types your shop uses.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:dassault-forum
**Operations:** post_processing

## Related
- [[catia-cam-tips-cat-070|Post-Processor Table Customization for Controller Compatibility]]
- [[catia-cam-tips-cat-071|Multi-Axis Post-Processor RTCP and TCP Mode Configuration]]
- [[catia-cam-tips-cat-072|Canned Cycle Output for Drilling Operations]]
- [[catia-cam-tips-cat-073|APT and CLDATA Output for Third-Party Post Processing]]
- [[catia-cam-tips-cat-074|Sub-Program Generation for Repeated Geometry Patterns]]
