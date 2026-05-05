---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-122
title: Hurco WinMax BNC vs ISNC mode — critical differences
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: tip
confidence: 95
source: controller:winmax_intro_workbook
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "bnc", "isnc", "mode", "fanuc-compatible", "tapping", "canned-cycles", "operation:tapping", "operation:boring", "machine:Hurco", "controller:fanuc"]
material_groups: []
operation_types: ["tapping", "boring"]
content_hash: fd8e9d089c6cf4a519495b88b496d31abc99d0a3cbcd618ce014fa906d9b1b9e
mirror_ts: 2026-05-05T13:36:00.858Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax BNC vs ISNC mode — critical differences

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `95` · **Source:** `controller:winmax_intro_workbook`

## Tip

WinMax supports two NC modes: BNC (Basic NC) uses Hurco-native syntax with relative Z values in canned cycles; ISNC (Industry Standard NC) is Fanuc-compatible with absolute Z values. Critical difference: tapping uses G88 in BNC mode but G84+M29 for rigid tapping in ISNC. Peck tapping (G84.2/G84.3) is ISNC-only. Boring cycle G86 behavior differs: BNC stops spindle and rapid retracts, ISNC feeds out with optional dwell. Set mode via Parameter 10 (0=BNC, 1=ISNC). Most CAM posts output ISNC for cross-controller compatibility.

## Applies to

- Operation types: `tapping`, `boring`

## Related tips

- [[ctrl-219|Hurco WinMax TVCC restrictions — G76, G87, G88 with I_J_ parameter not supported]] _(category+op:2+tag:5)_
- [[ctrl-148|Hurco BNC vs ISNC mode detection on machine]] _(category+op:1+tag:7)_
- [[ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]] _(category+op:2+tag:5)_
- [[ctrl-123|Hurco WinMax G84.2/G84.3 dual Z-word peck tapping]] _(category+op:1+tag:5)_
- [[ctrl-218|Hurco WinMax TVCC — tool vector canned cycles without transform plane]] _(category+op:1+tag:5)_

## Tags

#hurco #winmax #bnc #isnc #mode #fanuc-compatible #tapping #canned-cycles #operation-tapping #operation-boring #machine-hurco #controller-fanuc
