---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-059
title: Fanuc system variables for alarms and program control
category: programming
subcategory: macro
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "fanuc", "macro-b", "system-variables", "alarms", "programming", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: a9f024fa265e0fbc73258c3052c700f24b39232d81e0f845aa4b732fbd91e1f5
mirror_ts: 2026-05-05T13:36:03.938Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc system variables for alarms and program control

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Key Fanuc system variables for macro programming: #3000 = generates a custom alarm and halts program (e.g., #3000=101[TOOL BROKEN] — alarm number 101 with message, up to 26 chars). #3006 = displays message and pauses program (operator acknowledgment required, e.g., #3006=1[CHECK CLAMP]). #5001-#5006 = current end-point position (work coordinates). #5021-#5026 = current machine position. #5041-#5046 = current actual position. #5061-#5068 = skip signal (G31) position. #1000-#1035 = input signal status. #1100-#1115 = output signal status. #2001-#2200 = tool length offset values. #2401-#2600 = cutter radius compensation values. #3001 = millisecond timer. #3002 = hour meter. #4001-#4120 = modal G-code group states (read which G-codes are active).

## Related tips

- [[ctrl-156|Fanuc Macro B variable classes — local, common, system]] _(category+tag:5)_
- [[ctrl-052|Fanuc Macro B variable ranges and persistence]] _(category+tag:5)_
- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+tag:4)_
- [[ctrl-065|Fanuc Macro B tool breakage detection pattern]] _(category+tag:4)_
- [[ctrl-004|Fanuc Macro B custom probing cycles]] _(category+tag:3)_

## Tags

#controller #fanuc #macro-b #system-variables #alarms #programming #controller-fanuc
