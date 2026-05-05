---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-105
title: Haas G12/G13 circular pocket milling — CW/CCW without CAM
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "haas", "G12", "G13", "circular-pocket", "conversational", "operation:pocketing", "operation:roughing", "operation:finishing", "operation:milling", "machine:Haas"]
material_groups: []
operation_types: ["pocketing", "roughing", "finishing", "milling"]
content_hash: 76e908de848599c46df650d5d5cb69b233b2eb8268279d4a706bdc84673677a0
mirror_ts: 2026-05-05T13:36:03.989Z
mirror_engine: TribalVaultPopulatorEngine
---

# Haas G12/G13 circular pocket milling — CW/CCW without CAM

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

G12 (clockwise) and G13 (counterclockwise) are Haas-specific G-codes for circular pocket milling directly in the control without CAM. Parameters: I (first radius/stepover), J (second radius for taper), K (depth per pass), L (number of passes), D (cutter comp register), Q (start position offset). These are perfect for O-ring grooves, circular bosses, and simple round pockets. GOTCHA: the tool must be positioned at the pocket center before calling G12/G13 — the cycle machines outward from center. Combine with G12/G13 for roughing then a final spring pass at full depth for finishing.

## Applies to

- Operation types: `pocketing`, `roughing`, `finishing`, `milling`

## Related tips

- [[ctrl-089|Haas G150 general pocket milling — mini-CAM in G-code]] _(category+op:4+tag:8)_
- [[ctrl-198|Haas G150 general pocket milling — mandatory pre-drill and subprogram boundary format]] _(category+op:4+tag:7)_
- [[ctrl-138|Hurco WinMax Profile milling with Max Offset]] _(category+op:4+tag:4)_
- [[tk-dl-haas-001|Haas-specific G-codes beyond standard Fanuc: G143, G150, G154, G187, G234, G254]] _(op:4+tag:6)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:3+tag:4)_

## Tags

#controller #haas #g12 #g13 #circular-pocket #conversational #operation-pocketing #operation-roughing #operation-finishing #operation-milling #machine-haas
