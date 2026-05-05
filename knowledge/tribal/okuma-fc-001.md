---
schema_version: 1.0.0
kind: tribal_tip
id: okuma-fc-001
title: Okuma G181 drilling cycle uses I/K for rapid shift and Q for hole repeat count
category: cnc_programming
domain: document_learned
knowledge_type: tip
confidence: 95
source: document:okuma-fixed-cycles-manual
created_at: 2026-04-15
usage_count: 0
tags: ["okuma", "g-code", "drilling", "fixed-cycle", "g181", "lathe", "operation:drilling", "machine:Okuma"]
material_groups: []
operation_types: ["drilling"]
content_hash: f2763f011f7b05b8b6e720f5530caca364721fefd7a241a6b3b579e8575e1c64
mirror_ts: 2026-05-05T13:36:00.852Z
mirror_engine: TribalVaultPopulatorEngine
---

# Okuma G181 drilling cycle uses I/K for rapid shift and Q for hole repeat count

**Category:** `cnc_programming` · **Domain:** `document_learned`

**Confidence:** `95` · **Source:** `document:okuma-fixed-cycles-manual`

## Tip

G181 (Drilling Cycle with repeat function) format: G181,X,Z,C,R,I(K),F,Q,E. X/Z define cycle endpoint, R is infeed amount from start point (sign indicates direction), I is X-axis rapid shift, K is Z-axis rapid shift, F is feed rate, Q is number of equally spaced holes, E is optional dwell at bottom. For end face drilling, X is start point and Z is endpoint. For OD drilling, flip axis roles.

## Applies to

- Operation types: `drilling`

## Related tips

- [[okuma-fc-002|Okuma G183 deep hole drilling with peck uses D for depth per peck, L for relief]] _(category+op:1+tag:4)_
- [[okuma-fc-003|Okuma G178/G179 synchronized tapping uses D for start position, J for thread count]] _(category+tag:3)_
- [[okuma-fc-004|Okuma G185-G188 thread cutting cycles use SA= for C-axis rotation speed]] _(category+tag:3)_
- [[okuma-fc-005|Okuma G296/G297 fine boring retracts tool edge before extraction]] _(category+tag:3)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(op:1+tag:5)_

## Tags

#okuma #g-code #drilling #fixed-cycle #g181 #lathe #operation-drilling #machine-okuma
