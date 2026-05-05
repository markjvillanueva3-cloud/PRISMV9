---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-mc-wire-05
title: Reverse wire cutting eliminates re-threading
category: machining
domain: document_learned
knowledge_type: rule
confidence: 83
source: document:mastercam_wire_tutorial@ch2
created_at: 2026-03-01
usage_count: 0
tags: ["wire-edm", "reverse-cut", "threading", "cycle-time", "skim-cut", "operation:profiling", "operation:roughing", "operation:threading", "operation:edm"]
material_groups: []
operation_types: ["profiling", "roughing", "threading", "edm"]
content_hash: eebf4802f7a8eac15282bf73266d154ad18f30f91a471d5f46377899b7f4c150
mirror_ts: 2026-05-05T13:36:03.661Z
mirror_engine: TribalVaultPopulatorEngine
---

# Reverse wire cutting eliminates re-threading

**Category:** `machining` · **Domain:** `document_learned`

**Confidence:** `83` · **Source:** `document:mastercam_wire_tutorial@ch2`

## Tip

When a wire EDM contour requires multiple passes (rough + skims), reverse cutting runs alternating passes in opposite directions. This eliminates the need to re-thread the wire at the start point between passes — the wire simply reverses direction. Reduces cycle time by 1-3 minutes per pass (threading time). Not suitable for taper cuts where wire angle must be consistent. Source: Mastercam Wire Tutorial Ch.2.

## Applies to

- Operation types: `profiling`, `roughing`, `threading`, `edm`

## Related tips

- [[tk-dl-mc-wire-03|Wire EDM lead-in/lead-out geometry for burr-free cuts]] _(category+op:3+tag:4)_
- [[tk-dl-mc-wire-02|Tab cutting keeps wire EDM parts from dropping]] _(category+op:2+tag:3)_
- [[tk-dl-mc-wire-04|No-core wire EDM toolpaths for complete material removal]] _(category+op:2+tag:3)_
- [[tk-dl-mc-wire-06|Thread point placement near contour start]] _(category+op:2+tag:3)_
- [[ctrl-236|Mitsubishi Wire EDM program structure — multi-pass with offset variables]] _(op:3+tag:4)_

## Tags

#wire-edm #reverse-cut #threading #cycle-time #skim-cut #operation-profiling #operation-roughing #operation-threading #operation-edm
