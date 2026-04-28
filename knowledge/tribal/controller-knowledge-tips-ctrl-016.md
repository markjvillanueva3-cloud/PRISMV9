---
id: "ctrl-016"
title: "Siemens measuring cycles CYCLE977/978 for probing"
source: "controller:siemens_measuring_cycles"
confidence: 88
category: "programming"
tags: ["siemens", "probing", "cycle977", "cycle978", "measurement"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.165Z
---

# Siemens measuring cycles CYCLE977/978 for probing

SINUMERIK probing cycles: CYCLE977 (measure workpiece, set WCS), CYCLE978 (measure tool). Usage: CYCLE977(edge measurement) sets G54 automatically. CYCLE976 measures bore/boss. Pro tip: always run CYCLE996 (calibration cycle) after installing a new probe. Probe results are stored in $AA_MW[n] system variables. These cycles are WAY more user-friendly than manual G31 skip-signal probing on Fanuc.

**Category:** programming
**Confidence:** 88
**Source:** controller:siemens_measuring_cycles

## Related
- [[controller-knowledge-tips-ctrl-050|Universal probing compatibility across controllers]]
- [[controller-knowledge-tips-ctrl-053|Fanuc probing with G31 skip signal]]
- [[bobcad-cam-tips-bc-090|Machine-Specific Posts for Major CNC Brands]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-011|Siemens CYCLE832 high-speed machining settings]]
