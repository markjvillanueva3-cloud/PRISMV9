---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-096
title: Hole feature with Keep CAD features for CAM mapping
category: design
domain: document_learned
knowledge_type: tip
confidence: 92
source: document:hypercad-s-v33@p412
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "hypercad-s", "hole-feature", "drilling", "feature-mapping", "operation:drilling"]
material_groups: []
operation_types: ["drilling"]
content_hash: 657ff811e3dc97d337154deb0b408591810f6f0da1650396d867e8c9363b521e
mirror_ts: 2026-05-05T13:36:01.051Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hole feature with Keep CAD features for CAM mapping

**Category:** `design` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:hypercad-s-v33@p412`

## Tip

When creating holes with Features → Holes, enable 'Keep CAD features' for Feature mapping (hole). This creates an associative link between the CAD hole feature and the CAM feature, so hole modifications in CAD automatically update the drilling cycle. Base mode supports max 2-step holes with parametric modeling. Advanced mode supports up to 15 steps + 10 opposite steps, conical/undercut profiles.

## Applies to

- Operation types: `drilling`

## Related tips

- [[tk-dl-cnc-013|Non-standard hole sizes require end mill boring — 5-10× slower than drilling]] _(category+op:1+tag:1)_
- [[tk-dl-hm-085|Electrode design critical warnings]] _(category+tag:2)_
- [[tk-dl-hm-073|Workplane on axial face/hole for drilling setups]] _(op:1+tag:4)_
- [[tk-dl-hm-084|V-sketch as updatable machining contour]] _(category+tag:2)_
- [[tk-dl-hm-082|Draft angle analysis for mold parting and EDM]] _(category+tag:2)_

## Tags

#hypermill #hypercad-s #hole-feature #drilling #feature-mapping #operation-drilling
