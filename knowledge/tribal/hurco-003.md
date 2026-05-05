---
schema_version: 1.0.0
kind: tribal_tip
id: hurco-003
title: Hurco WinMax Pocket Boundary/Island handles complex pocket geometry automatically
category: cnc_programming
domain: document_learned
knowledge_type: anti_pattern
confidence: 91
source: document:hurco-winmax-cutter-comp
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "pocket", "island", "boundary", "spiral", "operation:pocketing", "machine:Hurco"]
material_groups: []
operation_types: ["pocketing"]
content_hash: 5f85a37b4043c8818f9e7c99cc400313d2f5a61f1a01b6e94322021ad927a59f
mirror_ts: 2026-05-05T13:36:01.216Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax Pocket Boundary/Island handles complex pocket geometry automatically

**Category:** `cnc_programming` · **Domain:** `document_learned`

**Confidence:** `91` · **Source:** `document:hurco-winmax-cutter-comp`

## Tip

Hurco WinMax Pocket Boundary defines the outer pocket limit, Pocket Island defines internal features to avoid. Pocket Type = Outward starts from center and spirals out (circles/frames without islands). Pocket Type = Inward cuts from outside boundary, avoiding islands. Define as many islands as needed within available memory. Island cannot follow Outward boundary — change to Inward. Order of segment programming determines initial tool direction.

## Applies to

- Operation types: `pocketing`

## Related tips

- [[hurco-002|Hurco WinMax Inside/Outside milling with Blend Moves uses 180-degree arc entry]] _(category+op:1+tag:3)_
- [[ctrl-139|Hurco WinMax pocket milling strategies]] _(op:1+tag:6)_
- [[hurco-001|Hurco WinMax cutter comp Left = climb milling, Right = conventional milling]] _(category+tag:3)_
- [[5ax-001|M31 rotary axis encoder reset prevents unwinding to zero on Hurco 5-axis]] _(category+tag:2)_
- [[5ax-002|M126 Shortest Angular Traverse prevents long rotary moves on Hurco]] _(category+tag:2)_

## Tags

#hurco #winmax #pocket #island #boundary #spiral #operation-pocketing #machine-hurco
