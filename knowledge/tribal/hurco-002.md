---
schema_version: 1.0.0
kind: tribal_tip
id: hurco-002
title: Hurco WinMax Inside/Outside milling with Blend Moves uses 180-degree arc entry
category: cnc_programming
domain: document_learned
knowledge_type: tip
confidence: 92
source: document:hurco-winmax-cutter-comp
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "blend-moves", "arc-entry", "inside", "outside", "operation:profiling", "operation:finishing", "operation:milling", "machine:Hurco"]
material_groups: []
operation_types: ["milling", "contouring", "pocketing"]
content_hash: 225df4d8202c08839d2753791e0547bc1bfece5df9aac4e1d026ca592f61a337
mirror_ts: 2026-05-05T13:36:01.078Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax Inside/Outside milling with Blend Moves uses 180-degree arc entry

**Category:** `cnc_programming` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:hurco-winmax-cutter-comp`

## Tip

When Enable Blend Moves = YES, Hurco WinMax Inside and Outside milling types enter/exit the cut using a 180-degree arc blend. This prevents tool marks at entry/exit points. For closed contours (circles, frames, ellipses), blend arc is automatic unless Blend Offset is 0. Use Profile Inside/Outside with No Blend Moves for tangent entry when blend marks are unacceptable in finish surface.

## Applies to

- Operation types: `milling`, `contouring`, `pocketing`

## Related tips

- [[hurco-001|Hurco WinMax cutter comp Left = climb milling, Right = conventional milling]] _(category+op:2+tag:5)_
- [[ctrl-138|Hurco WinMax Profile milling with Max Offset]] _(op:2+tag:6)_
- [[hurco-003|Hurco WinMax Pocket Boundary/Island handles complex pocket geometry automatically]] _(category+op:1+tag:3)_
- [[ctrl-139|Hurco WinMax pocket milling strategies]] _(op:2+tag:5)_
- [[5ax-006|G43.4 enables toolpath linearization for 5-axis simultaneous on Hurco]] _(category+tag:3)_

## Tags

#hurco #winmax #blend-moves #arc-entry #inside #outside #operation-profiling #operation-finishing #operation-milling #machine-hurco
