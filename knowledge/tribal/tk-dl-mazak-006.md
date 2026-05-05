---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-mazak-006
title: Mazatrol auto tool development: multi-drill staging by hole diameter
category: programming
subcategory: sub_program
domain: document_learned
knowledge_type: rule
confidence: 90
source: document:mazak-mazatrol-matrix@ch3-5-3
created_at: 2026-03-06
usage_count: 0
tags: ["mazak", "mazatrol", "auto-tool-development", "conversational", "drilling", "tool-staging", "operation:drilling", "operation:tapping", "operation:reaming", "operation:chamfering", "machine:Mazak", "tool:drill", "controller:mazak"]
material_groups: []
operation_types: ["drilling", "tapping", "reaming", "chamfering"]
content_hash: 788faaf7dfed7eda77830b6704c3d1e9675381aea708db386cd4b4ccf9ea292a
mirror_ts: 2026-05-05T13:36:01.473Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mazatrol auto tool development: multi-drill staging by hole diameter

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:mazak-mazatrol-matrix@ch3-5-3`

## Tip

Mazatrol conversational programming automatically develops (selects) tools based on hole geometry. For drilling: 1 drill if DIA <= D8 parameter, 2 drills if D8 < DIA <= D9, 3 drills if D9 < DIA <= D10. A centering drill is always included. Chamfering cutters are added unless chamfer=0 or hole+chamfer fits within existing tool diameter. The system generates alarm 416 'AUTO PROCESS IMPOSSIBLE' if depth < chamfer or diameter=0 or exceeds D10 limit. Same logic applies to counterbore (RGH CBOR), back counterbore (RGH BCB), reaming, and tapping units.

## Applies to

- Operation types: `drilling`, `tapping`, `reaming`, `chamfering`

## Related tips

- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(category+op:2+tag:7)_
- [[ctrl-219|Hurco WinMax TVCC restrictions — G76, G87, G88 with I_J_ parameter not supported]] _(category+op:3+tag:4)_
- [[ctrl-218|Hurco WinMax TVCC — tool vector canned cycles without transform plane]] _(category+op:2+tag:4)_
- [[nx-020|FBM Create Feature Process for Multi-Op Sequences]] _(op:3+tag:6)_
- [[ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]] _(category+op:2+tag:4)_

## Tags

#mazak #mazatrol #auto-tool-development #conversational #drilling #tool-staging #operation-drilling #operation-tapping #operation-reaming #operation-chamfering #machine-mazak #tool-drill #controller-mazak
