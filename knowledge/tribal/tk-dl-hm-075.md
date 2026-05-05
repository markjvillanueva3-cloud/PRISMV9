---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-075
title: Check quality/healing for imported geometry
category: quality
domain: document_learned
knowledge_type: rule
confidence: 95
source: document:hypercad-s-v33@p177
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "hypercad-s", "healing", "import", "geometry-repair"]
material_groups: []
operation_types: []
content_hash: d927b86267d13b706ee9dc69d6970019868ee412b978df5e682d76e2258792d2
mirror_ts: 2026-05-05T13:36:00.843Z
mirror_engine: TribalVaultPopulatorEngine
---

# Check quality/healing for imported geometry

**Category:** `quality` · **Domain:** `document_learned`

**Confidence:** `95` · **Source:** `document:hypercad-s-v33@p177`

## Tip

Use Analysis → Check quality / healing to diagnose imported CAD problems: vertex-edge gaps, face tolerance mismatches, incorrect edge sequences, non-manifold gaps, self-intersecting boundaries, entities smaller than tolerance, and irregular parameterization. Right-click a detected issue → Healing to auto-repair if possible. Set Reference tolerance to match your machining tolerance (e.g., 0.001mm). Always run this before CAM programming on imported STEP/IGES data.

## Related tips

- [[tk-dl-hm-077|Align faces orientation for correct tool position]] _(category+tag:3)_
- [[tk-dl-hm-076|Repair open solids for CAM]] _(category+tag:3)_
- [[tk-dl-hm-095|Simplify faces to reduce patch count before CAM]] _(category+tag:3)_
- [[tk-dl-hm-089|Probing result analysis and trend tracking]] _(category+tag:2)_
- [[tk-dl-hm-091|Toolpath feedrate analysis with color map]] _(category+tag:2)_

## Tags

#hypermill #hypercad-s #healing #import #geometry-repair
