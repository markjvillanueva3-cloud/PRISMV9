---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-191
title: Haas NGC M19 spindle orient — P-angle and Q-direction for precise back-boring
category: programming
subcategory: macro
domain: controller_specific
knowledge_type: rule
confidence: 94
source: controller:haas_ngc_programming_manual
created_at: 2026-04-15
usage_count: 0
tags: ["haas", "ngc", "m19", "spindle-orient", "g76", "g87", "fine-boring", "back-boring", "setting-46", "operation:boring", "machine:Haas", "tool:boring_bar", "controller:haas"]
material_groups: []
operation_types: ["boring"]
content_hash: d3bbf6979d69178549bf48d3e31d5f5da9ab1f8b33228b800803b2c91d70952f
mirror_ts: 2026-05-05T13:36:00.912Z
mirror_engine: TribalVaultPopulatorEngine
---

# Haas NGC M19 spindle orient — P-angle and Q-direction for precise back-boring

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `controller_specific`

**Confidence:** `94` · **Source:** `controller:haas_ngc_programming_manual`

## Tip

M19 commands a controlled spindle orient on Haas NGC machines, essential for fine boring (G76) and back boring (G87). Syntax: M19 P<angle> Q<direction> — P sets the orient angle (0-360 degrees, resolution 0.001 degree), Q1 = orient CW (positive direction), Q2 = orient CCW. Example: M19 P90.0 Q1 orients spindle 90 degrees clockwise. If P is omitted the control uses the value stored in Setting 46 (Parameter for fine boring tool shift direction). Q direction must match the tool geometry — a boring bar shifted in the wrong direction will gouge the bore wall on retract. Fine boring workflow: (1) M19 P<angle> Q<1or2> to orient spindle, (2) G76 Q<shift> to shift tool away from bore wall, (3) G00 retract clears without drag. For G87 back boring: M19 orients spindle before the tool enters the bore from below to clear the bore on entry. When Setting 46 is correctly configured, G76 and G87 call M19 automatically — manual M19 calls are only needed for custom macro cycles.

## Applies to

- Operation types: `boring`

## Related tips

- [[ctrl-153|Fanuc G76 fine boring — shift direction and dwell]] _(category+op:1+tag:5)_
- [[ctrl-197|Haas M138/M139 Spindle Speed Variation — chatter suppression without hardware]] _(category+op:1+tag:5)_
- [[ctrl-194|Haas Visual Quick Code (VQC) — conversational programming from the machine front panel]] _(category+op:1+tag:5)_
- [[ctrl-219|Hurco WinMax TVCC restrictions — G76, G87, G88 with I_J_ parameter not supported]] _(category+op:1+tag:3)_
- [[tk-dl-post-006|Canned cycle expansion: expand to linear moves when controller lacks the cycle]] _(category+op:1+tag:3)_

## Tags

#haas #ngc #m19 #spindle-orient #g76 #g87 #fine-boring #back-boring #setting-46 #operation-boring #machine-haas #tool-boring_bar #controller-haas
