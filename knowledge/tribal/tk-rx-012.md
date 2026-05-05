---
schema_version: 1.0.0
kind: tribal_tip
id: TK-RX-012
title: Impeller/blade machining: roughing order hub→splitter→main blade, finish in reverse
category: strategy
domain: document_learned
knowledge_type: rule
confidence: 85
source: document:hyperMILL-Skill-Roadmap@blade-impeller-machining
created_at: 2026-03-06
usage_count: 0
tags: ["impeller", "blisk", "blade", "turbine", "5-axis", "roughing-order", "finish-order", "operation:profiling", "operation:roughing", "operation:finishing", "operation:milling", "tool:bull_nose_endmill", "tool:ball_endmill"]
material_groups: []
operation_types: ["5-axis-milling", "roughing", "finishing", "impeller-machining"]
content_hash: 98c135e100083d9859bb53290a0ac22d2d7ab78ae0498697b1c715cdfd3d8331
mirror_ts: 2026-05-05T13:36:03.228Z
mirror_engine: TribalVaultPopulatorEngine
---

# Impeller/blade machining: roughing order hub→splitter→main blade, finish in reverse

**Category:** `strategy` · **Domain:** `document_learned`

**Confidence:** `85` · **Source:** `document:hyperMILL-Skill-Roadmap@blade-impeller-machining`

## Tip

Impeller/blisk machining sequence: ROUGHING order: (1) Hub area first (open access, establish datum surfaces). (2) Splitter blades next (shorter, less deflection). (3) Main blades last (longest, most flexible — hub already cleared for chip evacuation). FINISHING order: REVERSE — (1) Main blades first (full rigidity from remaining stock on hub). (2) Splitter blades. (3) Hub last (blades are finished, need careful collision avoidance). Use point milling (ball nose tip contact) for blade surfaces, not flank milling (blade twist prevents ruled surface assumption). Typical tolerances: blade profile ±0.02-0.05mm, leading/trailing edge ±0.01mm. Tool: ball nose 3-6mm for finishing, bull nose 6-12mm for roughing. Always verify tool access angle at blade root — this is the most collision-prone area.

## Applies to

- Operation types: `5-axis-milling`, `roughing`, `finishing`, `impeller-machining`

## Related tips

- [[tk-dl-inventorcam-hsm-001|InventorCAM HSM finishing: 17 strategies, ball nose step down = R/5, bull nose = R/3]] _(category+op:2+tag:6)_
- [[tk-dl-sim5x-001|Sim 5-axis strategy selection: parallel, morph, geodesic, SWARF, projection + tool axis modes]] _(category+op:2+tag:5)_
- [[tk-dl-siemens-5ax-002|Siemens COMPCAD vs COMPCURV: COMPCAD for 5-axis finish, COMPCURV for 3-axis roughing]] _(category+op:2+tag:4)_
- [[tk-dl-haas-003|Haas HSM: Acceleration Before Interpolation + full look-ahead, 1200 ipm contour]] _(category+op:2+tag:3)_
- [[tk-rx-011|5-axis swarf cutting: tool axis tangent to ruled surface, side-of-tool cuts entire wall in one pass]] _(category+op:2+tag:3)_

## Tags

#impeller #blisk #blade #turbine #5-axis #roughing-order #finish-order #operation-profiling #operation-roughing #operation-finishing #operation-milling #tool-bull_nose_endmill #tool-ball_endmill
