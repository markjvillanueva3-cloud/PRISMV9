---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-092
title: MAZATROL conversational vs EIA/ISO — interoperability
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: tip
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "mazak", "MAZATROL", "conversational", "EIA-ISO", "M11-gotcha", "machine:Mazak", "controller:fanuc", "controller:mazak"]
material_groups: []
operation_types: []
content_hash: 23b0f99a903390dad9f93a08d8a1f4d1365d57ba2350764ee13f86da6e793183
mirror_ts: 2026-05-05T13:36:03.974Z
mirror_engine: TribalVaultPopulatorEngine
---

# MAZATROL conversational vs EIA/ISO — interoperability

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

MAZATROL supports both conversational and EIA/ISO (G-code) programming. Key interoperability: a G-code program can call a MAZATROL conversational program as a subroutine, enabling mixed-mode workflows. Use conversational for simple prismatic features, probing, and tool measurement; use EIA/ISO for CAM-posted complex toolpaths. GOTCHA: M11 on Mazak means 'Spindle Tool Unclamp' — on most Fanuc machines it means 'Table Unclamp (4th axis)'. This is a critical safety difference when transferring programs. G53.5 (MAZATROL coordinate system) avoids work offset conflicts in conversational programs.

## Related tips

- [[ctrl-169|Mazatrol EIA vs Mazatrol conversational — when to use each and how they differ]] _(category+tag:5)_
- [[ctrl-026|Mazak MAZATROL Smooth conversational vs EIA/ISO]] _(category+tag:5)_
- [[ctrl-094|MAZATROL M-code and G-code documentation is buried — search tips]] _(category+tag:5)_
- [[tk-dl-mazak-006|Mazatrol auto tool development: multi-drill staging by hole diameter]] _(category+tag:4)_
- [[ctrl-175|Mazatrol system variables — #501 sub-spindle position and P901/P902 home parameters]] _(category+tag:4)_

## Tags

#controller #mazak #mazatrol #conversational #eia-iso #m11-gotcha #machine-mazak #controller-fanuc #controller-mazak
