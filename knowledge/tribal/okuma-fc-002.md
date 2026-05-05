---
schema_version: 1.0.0
kind: tribal_tip
id: okuma-fc-002
title: Okuma G183 deep hole drilling with peck uses D for depth per peck, L for relief
category: cnc_programming
domain: document_learned
knowledge_type: rule
confidence: 94
source: document:okuma-fixed-cycles-manual
created_at: 2026-04-15
usage_count: 0
tags: ["okuma", "g-code", "deep-drilling", "peck", "g183", "chip-breaking", "operation:drilling", "machine:Okuma", "tool:drill"]
material_groups: []
operation_types: ["drilling"]
content_hash: 5546084e02612c18dc505f3009e0f4637cb0baf4a1edfb6f50d0cd741dcc8271
mirror_ts: 2026-05-05T13:36:00.900Z
mirror_engine: TribalVaultPopulatorEngine
---

# Okuma G183 deep hole drilling with peck uses D for depth per peck, L for relief

**Category:** `cnc_programming` · **Domain:** `document_learned`

**Confidence:** `94` · **Source:** `document:okuma-fixed-cycles-manual`

## Tip

G183 (Deep Hole Drilling with repeat) adds D and L parameters: D specifies depth of cut per peck feed (chip breaking), L specifies axis relieving amount (retract distance for chip evacuation). For holes >3xD deep, always use G183 instead of G181. Break chips frequently to prevent chip packing and drill breakage. Set D to 1-2x drill diameter, L to 0.5-1mm for carbide drills.

## Applies to

- Operation types: `drilling`

## Related tips

- [[okuma-fc-001|Okuma G181 drilling cycle uses I/K for rapid shift and Q for hole repeat count]] _(category+op:1+tag:4)_
- [[ctrl-227|JM Die Okuma G74 peck drilling on lathe — deep hole drilling cycle]] _(op:1+tag:5)_
- [[tk-dl-okuma-001|CRITICAL: Okuma G28 = torque limit cancel (NOT home return!), G20 = home return]] _(op:1+tag:5)_
- [[okuma-fc-003|Okuma G178/G179 synchronized tapping uses D for start position, J for thread count]] _(category+tag:3)_
- [[okuma-fc-004|Okuma G185-G188 thread cutting cycles use SA= for C-axis rotation speed]] _(category+tag:3)_

## Tags

#okuma #g-code #deep-drilling #peck #g183 #chip-breaking #operation-drilling #machine-okuma #tool-drill
