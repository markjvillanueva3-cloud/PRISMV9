---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cnc-016
title: Wiper inserts improve face mill finish without reducing feed
category: tooling
subcategory: tool_selection
domain: document_learned
knowledge_type: tip
confidence: 85
source: document:cnc-face-mill-guide@wiper
created_at: 2026-03-03
usage_count: 0
tags: ["face-mill", "wiper-insert", "surface-finish", "productivity", "operation:face_milling", "operation:finishing", "operation:milling", "tool:face_mill", "tool:indexable_insert"]
material_groups: []
operation_types: ["face_milling", "finishing", "milling"]
content_hash: 2fb49c808223ef5e3f866351360cd36d5ac8349d968455f7d44ddcb5503d22d3
mirror_ts: 2026-05-05T13:36:03.205Z
mirror_engine: TribalVaultPopulatorEngine
---

# Wiper inserts improve face mill finish without reducing feed

**Category:** `tooling` · **Subcategory:** `tool_selection` · **Domain:** `document_learned`

**Confidence:** `85` · **Source:** `document:cnc-face-mill-guide@wiper`

## Tip

Wiper insert geometry on face mills allows achieving fine surface finish (Ra <0.8µm) at production feed rates. Standard inserts require reduced feed for finish passes. Wiper inserts have a secondary flat or radius that burnishes the surface on the trailing edge. Use one wiper insert per face mill body — more than one can cause vibration.

## Applies to

- Operation types: `face_milling`, `finishing`, `milling`

## Related tips

- [[tk-dl-cnc-008|45° face mill gives ~40% more MRR than 90° with balanced forces]] _(category+op:2+tag:4)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(op:3+tag:4)_
- [[tk-dl-cnc-009|Thread mill diameter must be < 70% of thread diameter]] _(category+op:2+tag:2)_
- [[gc-003|Facing operations benefit from climb milling with 65-75% stepover]] _(op:3+tag:4)_
- [[tk-dl-gcode-css-001|G96 CSS: RPM = (SFM × 12) / (π × diameter), G50 S-clamp prevents spindle overspeed]] _(op:3+tag:3)_

## Tags

#face-mill #wiper-insert #surface-finish #productivity #operation-face_milling #operation-finishing #operation-milling #tool-face_mill #tool-indexable_insert
