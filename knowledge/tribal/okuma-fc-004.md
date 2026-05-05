---
schema_version: 1.0.0
kind: tribal_tip
id: okuma-fc-004
title: Okuma G185-G188 thread cutting cycles use SA= for C-axis rotation speed
category: cnc_programming
domain: document_learned
knowledge_type: rule
confidence: 92
source: document:okuma-fixed-cycles-manual
created_at: 2026-04-15
usage_count: 0
tags: ["okuma", "g-code", "threading", "single-point", "c-axis", "g185", "g186", "operation:threading", "machine:Okuma"]
material_groups: []
operation_types: ["threading"]
content_hash: 4427a046c1d1dffd5f7d89ffde092efab1047f7a067593d1fbb37aeb28a3530d
mirror_ts: 2026-05-05T13:36:01.072Z
mirror_engine: TribalVaultPopulatorEngine
---

# Okuma G185-G188 thread cutting cycles use SA= for C-axis rotation speed

**Category:** `cnc_programming` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:okuma-fixed-cycles-manual`

## Tip

Thread cutting cycles G185 (longitudinal), G186 (transverse), G187 (straight longitudinal), G188 (straight face) include SA= parameter for C-axis rotation speed command. This calculates C-axis movement for thread cutting. G185/G186 are for single-point threading, G187/G188 are for continuous straight threads. I/K define taper endpoints for tapered threads. Always use G180 to cancel fixed cycle mode after completion.

## Applies to

- Operation types: `threading`

## Related tips

- [[okuma-fc-003|Okuma G178/G179 synchronized tapping uses D for start position, J for thread count]] _(category+op:1+tag:4)_
- [[okuma-fc-001|Okuma G181 drilling cycle uses I/K for rapid shift and Q for hole repeat count]] _(category+tag:3)_
- [[okuma-fc-002|Okuma G183 deep hole drilling with peck uses D for depth per peck, L for relief]] _(category+tag:3)_
- [[okuma-fc-005|Okuma G296/G297 fine boring retracts tool edge before extraction]] _(category+tag:3)_
- [[okuma-fc-006|Okuma G190 keyway cutting cycle uses M211-M214 for spindle orientation]] _(category+tag:3)_

## Tags

#okuma #g-code #threading #single-point #c-axis #g185 #g186 #operation-threading #machine-okuma
