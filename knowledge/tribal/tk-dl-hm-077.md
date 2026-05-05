---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-077
title: Align faces orientation for correct tool position
category: quality
domain: document_learned
knowledge_type: correction
confidence: 94
source: document:hypercad-s-v33@p265
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "hypercad-s", "face-normals", "import", "toolpath"]
material_groups: []
operation_types: []
content_hash: 5cd7bf59b7e40b317526019e290467b525c984e58776213ac3711d27a3c61462
mirror_ts: 2026-05-05T13:36:00.897Z
mirror_engine: TribalVaultPopulatorEngine
---

# Align faces orientation for correct tool position

**Category:** `quality` · **Domain:** `document_learned`

**Confidence:** `94` · **Source:** `document:hypercad-s-v33@p265`

## Tip

Use Modify → Align faces orientation to fix inconsistent face normals on imported data. 'Uniform orientation' → Align auto-orients the face nearest the user outward and propagates to connected faces topologically. This is critical for CAM: hyperMILL calculates tool position based on face normal vectors, so inverted normals cause the tool to cut on the wrong side.

## Related tips

- [[tk-dl-hm-075|Check quality/healing for imported geometry]] _(category+tag:3)_
- [[tk-dl-hm-076|Repair open solids for CAM]] _(category+tag:3)_
- [[tk-dl-hm-091|Toolpath feedrate analysis with color map]] _(category+tag:3)_
- [[tk-dl-hm-092|Toolpath-to-shape distance analysis for ball mills]] _(category+tag:3)_
- [[tk-dl-hm-095|Simplify faces to reduce patch count before CAM]] _(category+tag:3)_

## Tags

#hypermill #hypercad-s #face-normals #import #toolpath
