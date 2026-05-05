---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-haas-002
title: Haas macro variables: #7001-#7386 work offsets, #8608-#8617 tool usage tracking
category: controller
domain: document_learned
knowledge_type: tip
confidence: 90
source: document:haas-2023-mill-operators-manual@macros
created_at: 2026-03-06
usage_count: 0
tags: ["haas", "macro", "variables", "automation", "tool-usage", "work-offsets", "G154", "machine:Haas"]
material_groups: []
operation_types: []
content_hash: be2057b637ed5684985714e4e34716d494b4fcf4ad0ec911e300e01704297183
mirror_ts: 2026-05-05T13:36:38.174Z
mirror_engine: TribalVaultPopulatorEngine
---

# Haas macro variables: #7001-#7386 work offsets, #8608-#8617 tool usage tracking

**Category:** `controller` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:haas-2023-mill-operators-manual@macros`

## Tip

Haas macro variable ranges for automation: #7001-#7006 = G110 (G154 P1) offsets, #7021-#7026 = G111 (G154 P2), through #7041-#7386 for G112-G129 (G154 P3-P20). Extended: #14001-#15966 for G154 P1-P99. Tool usage tracking: #8608 (set desired tool), #8609 (current tool number), #8610 (total time for tool), #8611 (feed time), #8612 (total time all tools), #8605 (next usage), #8614-#8617 (usage timestamps and loads). Key macro codes: G65 Pxx (macro subprogram call with variable passing), M96 Pxx Qxx (conditional branch on discrete input = 0), M97 Pxx (local subroutine call), M109 (interactive user input). Note: Haas stores decimals as binary — variables may read ±1 LSB (e.g., 7.000000 stored as 6.999999 or 7.000001).

## Related tips

- [[tk-dl-haas-001|Haas-specific G-codes beyond standard Fanuc: G143, G150, G154, G187, G234, G254]] _(category+tag:2)_
- [[tk-dl-okuma-001|CRITICAL: Okuma G28 = torque limit cancel (NOT home return!), G20 = home return]] _(category)_
- [[tk-dl-siemens-5ax-001|Siemens SINUMERIK 5-axis: TRAORI activation, CYCLE832 8-digit encoding, orientation modes]] _(category)_
- [[tk-dl-okuma-002|Okuma named variables and LAP auto-programming (G80-G88) for turning cycles]] _(category)_
- [[tk-dl-siemens-3d-comp-001|Siemens 3D tool radius compensation: CUT2D/CUT3DC/CUT3DCC/CUT3DF modes for 5-axis]] _(category)_

## Tags

#haas #macro #variables #automation #tool-usage #work-offsets #g154 #machine-haas
