---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-034
title: CONNECTED Machining performs consistency checks before NC transfer
category: setup
subcategory: probing
domain: document_learned
knowledge_type: rule
confidence: 90
source: document:hypermill-vmc-v33@p44-46
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "connected-machining", "consistency-check", "heidenhain", "siemens", "nc-transfer", "v33", "controller:siemens", "controller:heidenhain"]
material_groups: []
operation_types: []
content_hash: 421ed62ca1c3e53c81086966bc5bfce89d0c14d97673f00381064f46635a053b
mirror_ts: 2026-05-05T13:36:01.439Z
mirror_engine: TribalVaultPopulatorEngine
---

# CONNECTED Machining performs consistency checks before NC transfer

**Category:** `setup` · **Subcategory:** `probing` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:hypermill-vmc-v33@p44-46`

## Tip

hyperMILL CONNECTED Machining connects VMC to Heidenhain or Siemens controllers for bidirectional data exchange. Before running NC programs, it performs consistency checks: origin table, tool table, and machine configuration must match between CAM and controller. Errors (red) block program loading. Warnings (yellow) allow loading with confirmation. The system transfers NC programs, reads probing protocols for Best Fit, and can control machine feedrate/spindle/program execution remotely. Supports Heidenhain (IP-based) and Siemens (IP + key + config file) connections.

## Related tips

- [[tk-dl-hm-022|Max angle increment must match controller RTCP capability]] _(category+tag:2)_
- [[tk-dl-hm-038|Boundary tool reference modes: Past avoids nose-diving in cavities]] _(category+tag:2)_
- [[tk-dl-hm-025|hyperMILL Python API job type codes for CAM automation]] _(category+tag:2)_
- [[tk-dl-hm-035|VMC axis analysis detects unusual movements before machine run]] _(category+tag:2)_
- [[tk-dl-hm-048|CAD import: hyperMILL reads STEP, NX, IGES, Parasolid, CATIA, and native formats]] _(category+tag:2)_

## Tags

#hypermill #connected-machining #consistency-check #heidenhain #siemens #nc-transfer #v33 #controller-siemens #controller-heidenhain
