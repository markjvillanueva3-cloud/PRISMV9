---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-sim5x-001
title: Sim 5-axis strategy selection: parallel, morph, geodesic, SWARF, projection + tool axis modes
category: strategy
domain: document_learned
knowledge_type: rule
confidence: 88
source: document:InventorCAM-Sim-5X-User-Guide
created_at: 2026-03-06
usage_count: 0
tags: ["5-axis", "simultaneous", "strategy-selection", "parallel", "morph", "geodesic", "SWARF", "projection", "tool-axis", "operation:profiling", "operation:roughing", "operation:finishing", "operation:milling", "operation:hsm", "operation:5_axis"]
material_groups: []
operation_types: ["profiling", "roughing", "finishing", "milling", "hsm", "5_axis"]
content_hash: bca04db316dcfe81cc34f3f605e7dd8afa28495025384621de2df518f3ec5a46
mirror_ts: 2026-05-05T13:36:02.160Z
mirror_engine: TribalVaultPopulatorEngine
---

# Sim 5-axis strategy selection: parallel, morph, geodesic, SWARF, projection + tool axis modes

**Category:** `strategy` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:InventorCAM-Sim-5X-User-Guide`

## Tip

Simultaneous 5-axis strategy selection tree: (1) Parallel Cuts: general surface finishing, linear or constant-Z work types. (2) Parallel to Curve/Surface: follow edge contour — drive and check surfaces MUST share common edge. Ball-nose tools MUST enable Tool center based calculation. (3) Morph between curves: impeller blades, twisted parts. (4) Geodesic: complex 3D shapes requiring CONSTANT step-over and undercut areas. (5) SWARF: steep walls/ruled surfaces — line contact for superior finish. (6) Projection: projects curves onto drive surfaces. (7) Contour 5X: wire-frame input, no machining surfaces needed. (8) 3-to-5 conversion: deep cavities — convert HSM ops using shorter tools with tilt, source MUST use ball-nose. Tool axis control modes: tilted relative to cutting direction (lead/lag + side tilt), tilted to surface normal, tilted to/from point, tilted through/from curve. Climb milling preferred for heat-treated alloys; conventional for rough castings/forgings.

## Applies to

- Operation types: `profiling`, `roughing`, `finishing`, `milling`, `hsm`, `5_axis`

## Related tips

- [[tk-dl-inventorcam-hsm-001|InventorCAM HSM finishing: 17 strategies, ball nose step down = R/5, bull nose = R/3]] _(category+op:5+tag:6)_
- [[tk-dl-haas-003|Haas HSM: Acceleration Before Interpolation + full look-ahead, 1200 ipm contour]] _(category+op:5+tag:5)_
- [[tk-dl-siemens-5ax-002|Siemens COMPCAD vs COMPCURV: COMPCAD for 5-axis finish, COMPCURV for 3-axis roughing]] _(category+op:4+tag:5)_
- [[tk-dl-hm-102|5-Axis job sequence: face→rough→chamfer→contour→plane→multi-orientation finish]] _(op:5+tag:6)_
- [[gc-173|GibbsCAM 5-axis flank milling of gear teeth achieves superior surface finish]] _(op:5+tag:6)_

## Tags

#5-axis #simultaneous #strategy-selection #parallel #morph #geodesic #swarf #projection #tool-axis #operation-profiling #operation-roughing #operation-finishing #operation-milling #operation-hsm #operation-5_axis
