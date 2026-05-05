---
schema_version: 1.0.0
kind: tribal_tip
id: okuma-fc-005
title: Okuma G296/G297 fine boring retracts tool edge before extraction
category: cnc_programming
domain: document_learned
knowledge_type: rule
confidence: 91
source: document:okuma-fixed-cycles-manual
created_at: 2026-04-15
usage_count: 0
tags: ["okuma", "g-code", "boring", "fine-boring", "back-boring", "g296", "g297", "operation:finishing", "operation:boring", "machine:Okuma"]
material_groups: []
operation_types: ["boring"]
content_hash: 5715ca48d3482bd56118ce99d9fe4c3689b224b4194993c3b082b2b170268774
mirror_ts: 2026-05-05T13:36:01.212Z
mirror_engine: TribalVaultPopulatorEngine
---

# Okuma G296/G297 fine boring retracts tool edge before extraction

**Category:** `cnc_programming` · **Domain:** `document_learned`

**Confidence:** `91` · **Source:** `document:okuma-fixed-cycles-manual`

## Tip

G296 (Fine Boring) retracts the tool edge using HS parameter after finishing cut, then extracts tool cleanly. G297 (Back Boring) does the opposite — retracts edge before insertion for machining the back side of holes. HS specifies the spindle orientation angle for edge retraction. These cycles prevent tool drag marks on precision bore finishes. Always use on holes requiring Ra < 1.6μm surface finish.

## Applies to

- Operation types: `boring`

## Related tips

- [[okuma-fc-006|Okuma G190 keyway cutting cycle uses M211-M214 for spindle orientation]] _(category+tag:4)_
- [[okuma-fc-001|Okuma G181 drilling cycle uses I/K for rapid shift and Q for hole repeat count]] _(category+tag:3)_
- [[okuma-fc-002|Okuma G183 deep hole drilling with peck uses D for depth per peck, L for relief]] _(category+tag:3)_
- [[okuma-fc-003|Okuma G178/G179 synchronized tapping uses D for start position, J for thread count]] _(category+tag:3)_
- [[okuma-fc-004|Okuma G185-G188 thread cutting cycles use SA= for C-axis rotation speed]] _(category+tag:3)_

## Tags

#okuma #g-code #boring #fine-boring #back-boring #g296 #g297 #operation-finishing #operation-boring #machine-okuma
