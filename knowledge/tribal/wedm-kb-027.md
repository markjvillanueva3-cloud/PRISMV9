---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-027
title: Wire EDM work coordinate: always edge-find in X and Y
category: setup
subcategory: datum
domain: process_engineering
knowledge_type: rule
confidence: 89
source: handbook:sodick_operation_manual
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "work-coordinate", "edge-finding", "datum", "wcs", "operation:edm"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 2ec018fd30ff0bdf52651fc8f40bba6bfbc24e97a6952e7820ebe1a888cdbd88
mirror_ts: 2026-05-05T13:36:02.104Z
mirror_engine: TribalVaultPopulatorEngine
---

# Wire EDM work coordinate: always edge-find in X and Y

**Category:** `setup` · **Subcategory:** `datum` · **Domain:** `process_engineering`

**Confidence:** `89` · **Source:** `handbook:sodick_operation_manual`

## Tip

Set work coordinates by touching off with the wire to 2 perpendicular edges (X and Y datum surfaces). The machine's automatic edge-finding cycle energizes the wire at low power and detects first contact. Use the SAME wire for edge-finding and cutting — different wire diameters have different deflection. After edge-finding, verify by cutting a test feature and measuring. For die work, datum from the die shoe locating surfaces, not random edges.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-006|JM Die glue stop convention — M01 before tab burn-out points]] _(category+op:1+tag:2)_
- [[bc-156|BobCAD Wire EDM Multi-Pass Technology Table Management]] _(category+op:1+tag:2)_
- [[jm-die-001|JM Die H175 master offset convention — use H175 as the primary offset base]] _(category+op:1+tag:1)_
- [[jm-die-005|JM Die Mitsubishi FA startup sequence — M78-M80-M82-M84 then M20]] _(category+op:1+tag:1)_
- [[jm-die-015|JM Die program shutdown sequence — M21-M85-M83-M81-M79 then M02]] _(category+op:1+tag:1)_

## Tags

#wire-edm #work-coordinate #edge-finding #datum #wcs #operation-edm
