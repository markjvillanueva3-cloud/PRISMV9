---
id: "cat-186"
title: "PP Table Word Address Customization for Controller-Specific Output"
source: "web:catia-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["catia", "post-processor", "pp-table", "word-address", "controller"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.961Z
---

# PP Table Word Address Customization for Controller-Specific Output

CATIA V5 post processors use PP tables (.pp_table) that map internal CL events to G-code words. Customize the word address section for your specific CNC controller: Fanuc uses G28 for home return, Heidenhain uses CYCL DEF, Siemens uses SUPA. In the PP table editor, modify the 'Word Format' section to set decimal places (X3.4 for Fanuc = 3 integer + 4 decimal digits), leading/trailing zeros, and sign convention. Critical customization: the MULTAX_ON/MULTAX_OFF events that switch between 3-axis and 5-axis modes — these must match your controller's exact syntax for axis activation (e.g., Fanuc G43.4 vs G43.5, Heidenhain M128 vs TCPM).

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:catia-docs
**Operations:** post_processing

## Related
- [[catia-cam-tips-cat-070|Post-Processor Table Customization for Controller Compatibility]]
- [[catia-cam-tips-cat-071|Multi-Axis Post-Processor RTCP and TCP Mode Configuration]]
- [[catia-cam-tips-cat-072|Canned Cycle Output for Drilling Operations]]
- [[catia-cam-tips-cat-073|APT and CLDATA Output for Third-Party Post Processing]]
- [[catia-cam-tips-cat-074|Sub-Program Generation for Repeated Geometry Patterns]]
