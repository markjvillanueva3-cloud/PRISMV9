---
schema_version: 1.0.0
kind: tribal_tip
id: okuma-fc-006
title: Okuma G190 keyway cutting cycle uses M211-M214 for spindle orientation
category: cnc_programming
domain: document_learned
knowledge_type: tip
confidence: 90
source: document:okuma-fixed-cycles-manual
created_at: 2026-04-15
usage_count: 0
tags: ["okuma", "g-code", "keyway", "milling", "spindle-orient", "g190", "operation:finishing", "machine:Okuma"]
material_groups: []
operation_types: ["milling", "keyway"]
content_hash: 3c3ae4000ef4a1cbaf13c2e9d7eb135c969b638b0c8a476b9cf539de3d871348
mirror_ts: 2026-05-05T13:36:01.508Z
mirror_engine: TribalVaultPopulatorEngine
---

# Okuma G190 keyway cutting cycle uses M211-M214 for spindle orientation

**Category:** `cnc_programming` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:okuma-fixed-cycles-manual`

## Tip

G190 (Key Way Cutting with repeat) uses M211/M212 for spindle CW/CCW orientation and M213/M214 for spindle clamp/release. Format: G190,X,Z,C,I(K),D,U(W),E,F,Q,M211,M213. D is depth of cut per pass, U/W are finish allowances for side/face. The cycle indexes to each C position (equally spaced by Q), orients spindle, clamps, and cuts keyway. Critical: verify spindle clamp pressure before cutting deep keyways.

## Applies to

- Operation types: `milling`, `keyway`

## Related tips

- [[okuma-fc-005|Okuma G296/G297 fine boring retracts tool edge before extraction]] _(category+tag:4)_
- [[okuma-fc-001|Okuma G181 drilling cycle uses I/K for rapid shift and Q for hole repeat count]] _(category+tag:3)_
- [[okuma-fc-002|Okuma G183 deep hole drilling with peck uses D for depth per peck, L for relief]] _(category+tag:3)_
- [[okuma-fc-003|Okuma G178/G179 synchronized tapping uses D for start position, J for thread count]] _(category+tag:3)_
- [[okuma-fc-004|Okuma G185-G188 thread cutting cycles use SA= for C-axis rotation speed]] _(category+tag:3)_

## Tags

#okuma #g-code #keyway #milling #spindle-orient #g190 #operation-finishing #machine-okuma
