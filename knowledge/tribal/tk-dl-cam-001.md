---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cam-001
title: Constant Z for steep (30-90°), 3D Constant Step Over for shallow areas
category: strategy
domain: document_learned
knowledge_type: tip
confidence: 90
source: document:inventorcam-3d-hsm@ch2
created_at: 2026-03-03
usage_count: 0
tags: ["3d-finishing", "constant-z", "step-over", "slope-angle", "hybrid", "operation:finishing"]
material_groups: []
operation_types: ["finishing"]
content_hash: 8365bd0c135e57156bceab056d9045b3f799f600b76a9b2181d10654469501a1
mirror_ts: 2026-05-05T13:36:01.466Z
mirror_engine: TribalVaultPopulatorEngine
---

# Constant Z for steep (30-90°), 3D Constant Step Over for shallow areas

**Category:** `strategy` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:inventorcam-3d-hsm@ch2`

## Tip

Use Constant Z (waterline) finishing for steep model areas with inclination 30-90°. In shallow areas the Z-passes become widely spaced causing poor finish. Switch to 3D Constant Step Over or Linear machining for areas below ~30° inclination. The Hybrid Constant Z strategy automatically inserts additional passes in shallow zones between Z-levels.

## Applies to

- Operation types: `finishing`

## Related tips

- [[tk-rx-006|Strategy selection by surface wall angle: <30° planar, 30-45° equidistant, >45° Z-level]] _(category+op:1+tag:2)_
- [[tk-dl-haas-003|Haas HSM: Acceleration Before Interpolation + full look-ahead, 1200 ipm contour]] _(category+op:1+tag:1)_
- [[tk-dl-siemens-5ax-002|Siemens COMPCAD vs COMPCURV: COMPCAD for 5-axis finish, COMPCURV for 3-axis roughing]] _(category+op:1+tag:1)_
- [[tk-dl-swarf-001|SWARF machining: line contact vs point, 3 deg max angle step, rib-before-pocket sequencing]] _(category+op:1+tag:1)_
- [[tk-dl-solidcam-003|Ball nose chip thickness varies with height: near tip chips are thin (rubbing risk), use stepdown ≤ 10% of ball diameter]] _(category+op:1+tag:1)_

## Tags

#3d-finishing #constant-z #step-over #slope-angle #hybrid #operation-finishing
