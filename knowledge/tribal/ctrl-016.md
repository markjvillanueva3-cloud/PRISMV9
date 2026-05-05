---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-016
title: Siemens measuring cycles CYCLE977/978 for probing
category: programming
subcategory: probing_routine
domain: controller_specific
knowledge_type: rule
confidence: 88
source: controller:siemens_measuring_cycles
created_at: 2026-03-07
usage_count: 0
tags: ["siemens", "probing", "cycle977", "cycle978", "measurement", "operation:boring", "controller:fanuc", "controller:siemens"]
material_groups: []
operation_types: ["boring"]
content_hash: 95377eed224f4fa3be7103f2abd7a99a953afcc78e6bc67b9651218765ccaf88
mirror_ts: 2026-05-05T13:36:02.215Z
mirror_engine: TribalVaultPopulatorEngine
---

# Siemens measuring cycles CYCLE977/978 for probing

**Category:** `programming` · **Subcategory:** `probing_routine` · **Domain:** `controller_specific`

**Confidence:** `88` · **Source:** `controller:siemens_measuring_cycles`

## Tip

SINUMERIK probing cycles: CYCLE977 (measure workpiece, set WCS), CYCLE978 (measure tool). Usage: CYCLE977(edge measurement) sets G54 automatically. CYCLE976 measures bore/boss. Pro tip: always run CYCLE996 (calibration cycle) after installing a new probe. Probe results are stored in $AA_MW[n] system variables. These cycles are WAY more user-friendly than manual G31 skip-signal probing on Fanuc.

## Applies to

- Operation types: `boring`

## Related tips

- [[ctrl-164|Siemens 840D FFWON / FFWOF — feed-forward control for contour accuracy]] _(category+op:1+tag:3)_
- [[ctrl-122|Hurco WinMax BNC vs ISNC mode — critical differences]] _(category+op:1+tag:2)_
- [[ctrl-050|Universal probing compatibility across controllers]] _(category+tag:4)_
- [[ctrl-153|Fanuc G76 fine boring — shift direction and dwell]] _(category+op:1+tag:2)_
- [[tk-dl-gcode-exact-001|G09 vs G61 vs G60: exact stop (one-shot vs modal) and anti-backlash for probing]] _(category+op:1+tag:2)_

## Tags

#siemens #probing #cycle977 #cycle978 #measurement #operation-boring #controller-fanuc #controller-siemens
