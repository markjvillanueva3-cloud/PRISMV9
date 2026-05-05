---
schema_version: 1.0.0
kind: tribal_tip
id: TK-RX-011
title: 5-axis swarf cutting: tool axis tangent to ruled surface, side-of-tool cuts entire wall in one pass
category: strategy
domain: document_learned
knowledge_type: rule
confidence: 88
source: document:hyperMILL-Skill-Roadmap@swarf-cutting-algorithms
created_at: 2026-03-06
usage_count: 0
tags: ["swarf", "flank-milling", "5-axis", "ruled-surface", "wall-finishing", "LOC", "operation:finishing", "operation:milling", "operation:5_axis"]
material_groups: []
operation_types: ["5-axis-milling", "finishing", "wall-machining"]
content_hash: e413bf37ce33602b08183d583c3ecf08733b464eb937471cf90f69ebd97ccc23
mirror_ts: 2026-05-05T13:36:02.170Z
mirror_engine: TribalVaultPopulatorEngine
---

# 5-axis swarf cutting: tool axis tangent to ruled surface, side-of-tool cuts entire wall in one pass

**Category:** `strategy` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:hyperMILL-Skill-Roadmap@swarf-cutting-algorithms`

## Tip

Swarf (flank) milling uses the side of the cutter aligned tangent to a ruled surface, cutting the full wall height in a single pass. Requirements: (1) Surface must be ruled (can be swept by a straight line). (2) Tool must be long enough: LOC ≥ wall height + 2mm clearance. (3) Tool tilt follows surface normal — requires 5-axis simultaneous. Key parameters: lead angle 0-3° (slight lead prevents heel contact), tilt computed from surface UV direction. Advantages: 1 pass vs 5-20 Z-level passes, superior surface finish (no cusps), geometric accuracy (cutter matches surface). Risks: full-depth engagement generates high forces — reduce feed 30-50% from standard side milling. Check holder clearance at every point along the path.

## Applies to

- Operation types: `5-axis-milling`, `finishing`, `wall-machining`

## Related tips

- [[tk-rx-012|Impeller/blade machining: roughing order hub→splitter→main blade, finish in reverse]] _(category+op:2+tag:3)_
- [[tk-dl-cam-005|SWARF machining: line contact = fewer passes + better surface]] _(category+op:1+tag:4)_
- [[tk-dl-sim5x-001|Sim 5-axis strategy selection: parallel, morph, geodesic, SWARF, projection + tool axis modes]] _(category+op:1+tag:4)_
- [[tk-dl-siemens-5ax-002|Siemens COMPCAD vs COMPCURV: COMPCAD for 5-axis finish, COMPCURV for 3-axis roughing]] _(category+op:1+tag:3)_
- [[tk-dl-swarf-001|SWARF machining: line contact vs point, 3 deg max angle step, rib-before-pocket sequencing]] _(category+op:1+tag:3)_

## Tags

#swarf #flank-milling #5-axis #ruled-surface #wall-finishing #loc #operation-finishing #operation-milling #operation-5_axis
