---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-089
title: Probing result analysis and trend tracking
category: quality
subcategory: measurement
domain: document_learned
knowledge_type: tip
confidence: 94
source: document:hypercad-s-v33@p562
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "hypercad-s", "probing", "quality", "measurement"]
material_groups: []
operation_types: []
content_hash: 993b75678f0925eec1556f9841eae6a68e0c8e97c247d49c0e2f26d81a404e06
mirror_ts: 2026-05-05T13:36:00.898Z
mirror_engine: TribalVaultPopulatorEngine
---

# Probing result analysis and trend tracking

**Category:** `quality` · **Subcategory:** `measurement` · **Domain:** `document_learned`

**Confidence:** `94` · **Source:** `document:hypercad-s-v33@p562`

## Tip

Enable 'Create logs for CAD import' in probing settings BEFORE running probing jobs. Import results via CAM → Import probing data (*.txt, *.log, *.ompr). Deviations are measured in face normal direction. The Trend tab tracks accuracy across multiple measuring logs — colored dot movement shows production accuracy drift over time. Sort by Deviation column to find worst points. Probing points can be transferred to Deform entities for alignment correction.

## Related tips

- [[tk-dl-hm-090|Probing points to deformation correction workflow]] _(category+tag:3)_
- [[tk-dl-hm-075|Check quality/healing for imported geometry]] _(category+tag:2)_
- [[tk-dl-hm-077|Align faces orientation for correct tool position]] _(category+tag:2)_
- [[tk-dl-hm-076|Repair open solids for CAM]] _(category+tag:2)_
- [[tk-dl-hm-091|Toolpath feedrate analysis with color map]] _(category+tag:2)_

## Tags

#hypermill #hypercad-s #probing #quality #measurement
