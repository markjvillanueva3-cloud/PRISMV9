---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-030
title: TOOL Builder holder orientation: Z-axis coaxial to spindle, X-axis per taper type
category: tooling
subcategory: tool_selection
domain: document_learned
knowledge_type: rule
confidence: 93
source: document:hypermill-tool-builder-v33@p5-7
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "tool-builder", "holder-orientation", "taper", "hsk", "bt", "cat", "capto", "operation:slotting"]
material_groups: []
operation_types: ["slotting"]
content_hash: bb24b8a1318d57a2fc22254c4407153d0bb78cbb6851f6ed83e840ce26a876b1
mirror_ts: 2026-05-05T13:36:00.941Z
mirror_engine: TribalVaultPopulatorEngine
---

# TOOL Builder holder orientation: Z-axis coaxial to spindle, X-axis per taper type

**Category:** `tooling` · **Subcategory:** `tool_selection` · **Domain:** `document_learned`

**Confidence:** `93` · **Source:** `document:hypermill-tool-builder-v33@p5-7`

## Tip

hyperMILL TOOL Builder defines tool holder orientation standards: Z-axis always coaxial to main flange pointing toward spindle. X-axis alignment varies by taper: BT→center of slot (symmetrical), SK→center of flattest slot on notch side, CAT→center of flattest slot, HSK→center of flattest slot on notch side, CAPTO→Y-axis toward center of reference notch, KM→Y-axis through hole axis toward recess, KM4X→X-axis through center of lower slots toward notch. Upper coupling defined at flange depth (SK/CAT: 3.2mm above flange upper side).

## Applies to

- Operation types: `slotting`

## Related tips

- [[tk-dl-hm-macro-003|hyperMILL tool property namespace: 60+ properties for macro condition logic]] _(category+op:1+tag:1)_
- [[tk-dl-solidcam-005|Helix angle lag effect: chip thickness varies along flute length, 45° helix at 20mm DOC shifts engagement by ~23°]] _(category+op:1+tag:1)_
- [[tk-rx-002|Trochoidal milling tool life multiplier by material vs conventional slotting]] _(category+op:1+tag:1)_
- [[tb-002|Tool holder positional orientation follows specific conventions per spindle type]] _(tag:6)_
- [[tk-dl-hm-056|VT SelectPriority controls tool selection when multiple match]] _(category+tag:1)_

## Tags

#hypermill #tool-builder #holder-orientation #taper #hsk #bt #cat #capto #operation-slotting
