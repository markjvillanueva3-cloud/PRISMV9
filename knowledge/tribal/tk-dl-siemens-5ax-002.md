---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-siemens-5ax-002
title: Siemens COMPCAD vs COMPCURV: COMPCAD for 5-axis finish, COMPCURV for 3-axis roughing
category: strategy
domain: document_learned
knowledge_type: rule
confidence: 90
source: document:Siemens-SINUMERIK-5-Axis-Programming
created_at: 2026-03-06
usage_count: 0
tags: ["siemens", "COMPCAD", "COMPCURV", "compressor", "5-axis", "surface-quality", "spline", "C3-continuous", "operation:profiling", "operation:roughing", "operation:finishing", "operation:5_axis", "controller:siemens"]
material_groups: []
operation_types: ["profiling", "roughing", "finishing", "5_axis"]
content_hash: 0d514beda8a35217e7c6ded659a17defa66b330dbb5278f57c4be04cd638942c
mirror_ts: 2026-05-05T13:36:01.490Z
mirror_engine: TribalVaultPopulatorEngine
---

# Siemens COMPCAD vs COMPCURV: COMPCAD for 5-axis finish, COMPCURV for 3-axis roughing

**Category:** `strategy` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:Siemens-SINUMERIK-5-Axis-Programming`

## Tip

SINUMERIK compressor modes: COMPCURV (G-code COMPOF/COMPCURV) creates C2-continuous spline approximation — good for 3-axis roughing/semi-finish where tolerance can be relaxed. COMPCAD creates C3-continuous spline with curvature-continuous transitions — required for 5-axis finishing where surface quality matters. COMPCAD produces smoother acceleration profiles, reducing servo lag marks on curved surfaces. Performance impact: COMPCAD requires ~30% more NCK processing time than COMPCURV. Decision tree: 3-axis roughing → COMPCURV (speed); 3-axis finishing → COMPCAD (quality); 5-axis any → COMPCAD (mandatory for good surface). Program structure: CYCLE832 activates both compressor and tolerance in one call. Manual activation: COMPCAD + CTOL=0.01 + OTOL=0.01 for independent control of contour and orientation tolerance.

## Applies to

- Operation types: `profiling`, `roughing`, `finishing`, `5_axis`

## Related tips

- [[tk-dl-sim5x-001|Sim 5-axis strategy selection: parallel, morph, geodesic, SWARF, projection + tool axis modes]] _(category+op:4+tag:5)_
- [[tk-dl-haas-003|Haas HSM: Acceleration Before Interpolation + full look-ahead, 1200 ipm contour]] _(category+op:4+tag:4)_
- [[tk-dl-inventorcam-hsm-001|InventorCAM HSM finishing: 17 strategies, ball nose step down = R/5, bull nose = R/3]] _(category+op:3+tag:3)_
- [[tk-dl-hm-102|5-Axis job sequence: face→rough→chamfer→contour→plane→multi-orientation finish]] _(op:4+tag:5)_
- [[gc-173|GibbsCAM 5-axis flank milling of gear teeth achieves superior surface finish]] _(op:4+tag:5)_

## Tags

#siemens #compcad #compcurv #compressor #5-axis #surface-quality #spline #c3-continuous #operation-profiling #operation-roughing #operation-finishing #operation-5_axis #controller-siemens
