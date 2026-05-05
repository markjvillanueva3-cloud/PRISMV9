---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-011
title: Recast layer thickness determines part integrity
category: quality
domain: process_engineering
knowledge_type: rule
confidence: 93
source: handbook:klocke_2013_ch8
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "recast-layer", "surface-integrity", "ams-2628", "aerospace", "operation:roughing"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 98f7c7737cfbe8e0e33e036fb306cbd9a9e247edaeef09ef18873d9b119263e5
mirror_ts: 2026-05-05T13:36:01.029Z
mirror_engine: TribalVaultPopulatorEngine
---

# Recast layer thickness determines part integrity

**Category:** `quality` · **Domain:** `process_engineering`

**Confidence:** `93` · **Source:** `handbook:klocke_2013_ch8`

## Tip

WEDM always leaves a recast (white) layer on the cut surface. Thickness: rough cut 15-25µm, after 2 skims 5-10µm, after 4 skims 1-3µm. For aerospace (AMS 2628) and medical parts, maximum recast is typically 7.5µm (0.0003in). If recast exceeds spec after WEDM, mechanical polishing or chemical etching is required. Thermal penetration depth follows Carslaw-Jaeger: d = 2×sqrt(α×t_on). Lower ON time = thinner recast.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-013|JM Die offset cascade verification — H-values must strictly decrease per pass]] _(category+op:1+tag:2)_
- [[jm-die-016|JM Die program quality scoring — 4 factors: completeness, correctness, optimization, safety]] _(category+op:1+tag:2)_
- [[wedm-kb-019|Taper accuracy: skim passes are critical]] _(category+op:1+tag:2)_
- [[tk-dl-hm-076|Repair open solids for CAM]] _(category+tag:1)_
- [[esp-117|In-Process Inspection Between Operations]] _(category+tag:1)_

## Tags

#wire-edm #recast-layer #surface-integrity #ams-2628 #aerospace #operation-roughing
