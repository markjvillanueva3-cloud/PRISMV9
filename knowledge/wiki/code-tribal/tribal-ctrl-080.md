---
name: tribal-ctrl-080
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "siemens", "system-variables", "adaptive-machining", "monitoring", "synchronized-actions", "spindle-load"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-080.md
promoted_at: 2026-06-09T22:31:16.150Z
---

# SINUMERIK System Variables and Adaptive Machining

SINUMERIK exposes extensive system variables ($-variables) enabling adaptive machining strategies via synchronized actions or user cycles. Key variable families: **Drive/axis**: $AA_IM[axis] (actual position), $AA_LOAD[axis] (axis load %), $VA_CURR[axis] (drive current). **Spindle**: $AC_POWER (current spindle power as % of rated), $AN_SACT[spindle] (actual spindle speed), $AC_TORQUE (spindle torque). **Feed**: $AC_OVR (feed override %), $AC_VACTW (actual path velocity), $AC_DTEW (distance to end of block). **Program**: $P_TOOLNO (active tool number), $P_F (programmed feed), $P_S (programmed speed), $AC_TIME (machining time). Adaptive feed control example: ID=1 WHENEVER $AC_POWER>80 DO $AC_OVR=50 (halve feed when spindle power exceeds 80%). Tool breakage detection: ID=2 WHEN $AC_POWER<5 DO SETAL(61000) (alarm if power drops during cutting). Thermal compensation via axis offsets: $AA_OFF[X]=<value> applied from PLC-computed temperature data. These variables, combined with synchronized actions, enable sophisticated in-process monitoring without external hardware. The variable set is identical across 840D sl, 828D, and SINUMERIK ONE, though some drive-level variables require specific SINAMICS firmware versions.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-017|Siemens synchronized actions for real-time monitoring]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-059|Fanuc system variables for alarms and program control]]
- [[controller-knowledge-tips-ctrl-066|CYCLE800 Swivel Plane for 3+2 Axis Positioning]]
- [[controller-knowledge-tips-ctrl-067|TRAORI 5-Axis Simultaneous Transformation]]
