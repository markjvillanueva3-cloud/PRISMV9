---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-085
title: Electrode design critical warnings
category: design
domain: document_learned
knowledge_type: anti_pattern
confidence: 96
source: document:hypercad-s-v33@p444
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "hypercad-s", "electrode", "EDM", "warning", "operation:edm"]
material_groups: []
operation_types: ["edm"]
content_hash: a17f913301ceb39c232ee267aa477675289ad438cf1fc15ed6c87b2e7de3b2c1
mirror_ts: 2026-05-05T13:36:00.813Z
mirror_engine: TribalVaultPopulatorEngine
---

# Electrode design critical warnings

**Category:** `design` · **Domain:** `document_learned`

**Confidence:** `96` · **Source:** `document:hypercad-s-v33@p444`

## Tip

CRITICAL: Electrodes are non-parametric and non-associative to TAG data. After first electrode generation, DO NOT transform: EDM workplane, electrode workplane, solids/faces within electrode group, or workpiece — these changes will NOT propagate to existing TAG values, producing incorrect documentation. Electrode geometry is always 1:1 scale.

## Applies to

- Operation types: `edm`

## Related tips

- [[tk-dl-hm-082|Draft angle analysis for mold parting and EDM]] _(category+op:1+tag:4)_
- [[tk-dl-hm-083|Undercut analysis for machining accessibility]] _(category+op:1+tag:3)_
- [[tk-dl-hm-087|Side electrode for inaccessible erosion areas]] _(category+tag:4)_
- [[tk-dl-hm-088|Virtual electrodes for identical multi-position erosion]] _(category+tag:4)_
- [[tk-dl-hm-086|Electrode holder library and optimized C angle]] _(category+tag:3)_

## Tags

#hypermill #hypercad-s #electrode #edm #warning #operation-edm
