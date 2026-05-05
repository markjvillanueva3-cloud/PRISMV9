---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-mc-wire-06
title: Thread point placement near contour start
category: machining
domain: document_learned
knowledge_type: failure_mode
confidence: 80
source: document:mastercam_wire_tutorial@ch1
created_at: 2026-03-01
usage_count: 0
tags: ["wire-edm", "thread-point", "start-hole", "chaining", "setup", "operation:profiling", "operation:threading"]
material_groups: []
operation_types: ["profiling", "threading"]
content_hash: 18645033f6e0b99521f89a5815edb87aff1f8d71f0a63ccc09f74a9edb86449c
mirror_ts: 2026-05-05T13:36:03.912Z
mirror_engine: TribalVaultPopulatorEngine
---

# Thread point placement near contour start

**Category:** `machining` · **Domain:** `document_learned`

**Confidence:** `80` · **Source:** `document:mastercam_wire_tutorial@ch1`

## Tip

The thread point (where the wire is initially threaded through a pre-drilled hole) should be placed near the contour start point but NOT on the contour itself. Use 'break closest entity' to split the contour chain at the nearest point to the thread hole. Thread point offset from contour: 0.5-2mm. For multiple contours sharing a thread hole, chain them in order of proximity. Source: Mastercam Wire Tutorial Ch.1.

## Applies to

- Operation types: `profiling`, `threading`

## Related tips

- [[tk-dl-mc-wire-05|Reverse wire cutting eliminates re-threading]] _(category+op:2+tag:3)_
- [[tk-dl-mc-wire-02|Tab cutting keeps wire EDM parts from dropping]] _(category+op:1+tag:2)_
- [[tk-dl-mc-wire-03|Wire EDM lead-in/lead-out geometry for burr-free cuts]] _(category+op:1+tag:2)_
- [[tk-dl-mc-wire-04|No-core wire EDM toolpaths for complete material removal]] _(category+op:1+tag:2)_
- [[jm-die-003|JM Die E12xx heavy 5-pass for thick stock and cannelure dies — E1281-E1282-E1283-E1284-E1285]] _(category+tag:3)_

## Tags

#wire-edm #thread-point #start-hole #chaining #setup #operation-profiling #operation-threading
