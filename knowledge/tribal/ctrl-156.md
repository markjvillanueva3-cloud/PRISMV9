---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-156
title: Fanuc Macro B variable classes — local, common, system
category: programming
subcategory: macro
domain: controller_specific
knowledge_type: rule
confidence: 94
source: controller:fanuc_macro_manual
created_at: 2026-04-15
usage_count: 0
tags: ["fanuc", "macro-b", "variables", "#500", "#100", "system-variables", "programming", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: 63e5b9482539cf93475b5d06b8b0326ef305fedb64e66eaa2f3aeea288c693c4
mirror_ts: 2026-05-05T13:36:00.906Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc Macro B variable classes — local, common, system

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `controller_specific`

**Confidence:** `94` · **Source:** `controller:fanuc_macro_manual`

## Tip

Fanuc Macro B has three variable classes: (1) Local #1–#33: exist only within the current macro subprogram, cleared on return. (2) Common #100–#199: retained across macro calls, cleared on power off. (3) Common #500–#999: persistent — retained across power cycles (stored in SRAM). (4) System #1000+: read-only control status (e.g., #5001–#5008 = tool offset values; #5021–#5028 = current machine position; #5041–#5048 = current workpiece position; #4001–#4120 = current G/M modal values). Key tip: Use #500+ for calibration data that must survive power cycles (tool wear values, probe calibration offsets). Arithmetic: #100=#101+#102 (add), #100=SQRT[#101] (square root), #100=SIN[#101] (degrees). IF/GOTO for branching: IF[#1 GT 0] GOTO 10.

## Related tips

- [[ctrl-052|Fanuc Macro B variable ranges and persistence]] _(category+tag:5)_
- [[ctrl-059|Fanuc system variables for alarms and program control]] _(category+tag:5)_
- [[ctrl-004|Fanuc Macro B custom probing cycles]] _(category+tag:4)_
- [[ctrl-155|Fanuc Macro B skip function G31 — probing and in-process gauging]] _(category+tag:3)_
- [[ctrl-175|Mazatrol system variables — #501 sub-spindle position and P901/P902 home parameters]] _(category+tag:3)_

## Tags

#fanuc #macro-b #variables #500 #100 #system-variables #programming #controller-fanuc
