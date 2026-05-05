---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-mc-wire-03
title: Wire EDM lead-in/lead-out geometry for burr-free cuts
category: machining
domain: document_learned
knowledge_type: tip
confidence: 87
source: document:mastercam_wire_tutorial@ch1
created_at: 2026-03-01
usage_count: 0
tags: ["wire-edm", "lead-in", "lead-out", "burr", "contour", "wire", "operation:profiling", "operation:roughing", "operation:edm"]
material_groups: []
operation_types: ["profiling", "roughing", "edm"]
content_hash: 9e981dc248f269e5fa9e94a0c84f3d1a650ff5beb0bee745fd9d0907a6c5936d
mirror_ts: 2026-05-05T13:36:02.555Z
mirror_engine: TribalVaultPopulatorEngine
---

# Wire EDM lead-in/lead-out geometry for burr-free cuts

**Category:** `machining` · **Domain:** `document_learned`

**Confidence:** `87` · **Source:** `document:mastercam_wire_tutorial@ch1`

## Tip

Lead-in and lead-out geometry prevents witness marks at the contour entry/exit point. Best practice: use a line+arc lead (straight approach followed by tangent arc onto contour). Arc radius 0.125-0.5mm, sweep angle 60-90 degrees. Add 0.02mm overlap past the start point to eliminate the entry burr. For skim passes, use shorter leads than the rough cut. Source: Mastercam Wire Tutorial Ch.1.

## Applies to

- Operation types: `profiling`, `roughing`, `edm`

## Related tips

- [[tk-dl-mc-wire-05|Reverse wire cutting eliminates re-threading]] _(category+op:3+tag:4)_
- [[tk-dl-mc-wire-02|Tab cutting keeps wire EDM parts from dropping]] _(category+op:2+tag:3)_
- [[gc-063|2-axis wire EDM uses automatic lead-in to prevent witness marks on part]] _(op:3+tag:5)_
- [[tk-dl-mc-wire-04|No-core wire EDM toolpaths for complete material removal]] _(category+op:2+tag:3)_
- [[tk-dl-mc-wire-01|Wire EDM overburn decreases per skim pass]] _(category+op:1+tag:3)_

## Tags

#wire-edm #lead-in #lead-out #burr #contour #wire #operation-profiling #operation-roughing #operation-edm
