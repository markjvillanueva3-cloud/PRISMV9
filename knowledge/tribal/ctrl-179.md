---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-179
title: Okuma OSP macro V-variables vs Fanuc #-variables — syntax translation guide
category: programming
subcategory: macro
domain: controller_specific
knowledge_type: workaround
confidence: 94
source: controller:okuma_osp_programming_manual_p300
created_at: 2026-04-15
usage_count: 0
tags: ["okuma", "osp", "macro", "v-variables", "fanuc-comparison", "syntax", "parametric", "conversion", "machine:Okuma", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: 5665b4d3480de4d49c3ea832f50abd2005c9bb0a0d97eede243cfa9a069192c2
mirror_ts: 2026-05-05T13:36:00.910Z
mirror_engine: TribalVaultPopulatorEngine
---

# Okuma OSP macro V-variables vs Fanuc #-variables — syntax translation guide

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `controller_specific`

**Confidence:** `94` · **Source:** `controller:okuma_osp_programming_manual_p300`

## Tip

Okuma OSP macro programming uses V-variables instead of Fanuc #-variables. Key syntax differences: variable reference is V1–V999 (not #1–#999); assignment uses '=' (V10=25.0); grouping uses square brackets (V5=[V1+V2]*V3, NOT parentheses); trig functions take degrees directly (SIN[45.0], COS[90.0], TAN[30.0] — not radians). Persistent variables that survive power cycle: V500–V999. System variables use named tables: VSLDT (current axis position), VTLDT (tool offset data), VPRDT (program data) — not Fanuc #5000-series. Conditional branching: IF[V1 GT 10] GOTO N100 (Fanuc: IF[#1 GT 10] GOTO 100). The PRISM OkumaMacroConverter tool (resources/MACRO TO HARD CODE CONVERTER) automates #→V translation. After conversion, verify SIN/COS arguments are in degrees (not radians) and all '()' grouping brackets have been changed to '[]'.

## Related tips

- [[ctrl-180|Okuma OSP work offset format: G15 H## is native — G54 is compatibility mode only]] _(category+tag:5)_
- [[ctrl-181|Okuma G284 — OSP-native rigid tapping cycle, no M29 synchronization required]] _(category+tag:4)_
- [[ctrl-185|Okuma CALL OO88 — macro-based fixture offset for 3+2 tilted work plane machining]] _(category+tag:4)_
- [[ctrl-029|Okuma OSP unique G-code dialect]] _(category+tag:4)_
- [[ctrl-031|Okuma OSP Super-NURBS for smooth 5-axis]] _(category+tag:4)_

## Tags

#okuma #osp #macro #v-variables #fanuc-comparison #syntax #parametric #conversion #machine-okuma #controller-fanuc
