---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cam-007
title: Complementary finishing: Z-level + equidistant covers all slopes in one op
category: strategy
domain: document_learned
knowledge_type: tip
confidence: 88
source: document:hypermill-cam-strategies@3d-complementary
created_at: 2026-03-03
usage_count: 0
tags: ["complementary", "z-level", "equidistant", "slope-division", "combined", "operation:profiling", "operation:finishing"]
material_groups: []
operation_types: ["profiling", "finishing"]
content_hash: 97facc42779c4f7eb737ec970cdcae0ecdd72946ff00c49f72b367796cb52954
mirror_ts: 2026-05-05T13:36:02.143Z
mirror_engine: TribalVaultPopulatorEngine
---

# Complementary finishing: Z-level + equidistant covers all slopes in one op

**Category:** `strategy` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:hypermill-cam-strategies@3d-complementary`

## Tip

Combined/complementary finishing strategies automatically divide the model by slope angle and apply the optimal strategy to each region. Z-level finishing handles steep areas, equidistant/profile finishing handles flat areas. Both can use spiral patterns for best surface quality. This eliminates the need for separate steep/shallow operations and ensures no gaps at the transition.

## Applies to

- Operation types: `profiling`, `finishing`

## Related tips

- [[tk-dl-haas-003|Haas HSM: Acceleration Before Interpolation + full look-ahead, 1200 ipm contour]] _(category+op:2+tag:2)_
- [[tk-dl-siemens-5ax-002|Siemens COMPCAD vs COMPCURV: COMPCAD for 5-axis finish, COMPCURV for 3-axis roughing]] _(category+op:2+tag:2)_
- [[tk-dl-inventorcam-hsm-001|InventorCAM HSM finishing: 17 strategies, ball nose step down = R/5, bull nose = R/3]] _(category+op:2+tag:2)_
- [[tk-dl-sim5x-001|Sim 5-axis strategy selection: parallel, morph, geodesic, SWARF, projection + tool axis modes]] _(category+op:2+tag:2)_
- [[tk-dl-cam-014|Helical machining: continuous descending ramp avoids Z-level dwell marks]] _(category+op:2+tag:2)_

## Tags

#complementary #z-level #equidistant #slope-division #combined #operation-profiling #operation-finishing
