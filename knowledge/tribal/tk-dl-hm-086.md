---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-086
title: Electrode holder library and optimized C angle
category: design
domain: document_learned
knowledge_type: tip
confidence: 90
source: document:hypercad-s-v33@p448
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "hypercad-s", "electrode", "holder", "raw-material"]
material_groups: []
operation_types: []
content_hash: b6f358ccfb5995659d1b01918e08b8343b42f315e09df8f32bace0cb326ed1e2
mirror_ts: 2026-05-05T13:36:01.447Z
mirror_engine: TribalVaultPopulatorEngine
---

# Electrode holder library and optimized C angle

**Category:** `design` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:hypercad-s-v33@p448`

## Tip

Configure the electrode holder library (*.holders.xml) via Electrode holder editor before designing electrodes. The system auto-searches for a suitable holder by: calculating raw material X/Y from erosion face size, applying 'Optimized C angle' to rotate the holder for minimum material waste, finding the matching Z length. Set Min. block height > 0 to allow holder position rounding correction.

## Related tips

- [[tk-dl-hm-085|Electrode design critical warnings]] _(category+tag:3)_
- [[tk-dl-hm-087|Side electrode for inaccessible erosion areas]] _(category+tag:3)_
- [[tk-dl-hm-088|Virtual electrodes for identical multi-position erosion]] _(category+tag:3)_
- [[tk-dl-hm-084|V-sketch as updatable machining contour]] _(category+tag:2)_
- [[tk-dl-hm-082|Draft angle analysis for mold parting and EDM]] _(category+tag:2)_

## Tags

#hypermill #hypercad-s #electrode #holder #raw-material
