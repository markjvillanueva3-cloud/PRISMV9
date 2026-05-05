---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-swarf-001
title: SWARF machining: line contact vs point, 3 deg max angle step, rib-before-pocket sequencing
category: strategy
domain: document_learned
knowledge_type: anti_pattern
confidence: 90
source: document:InventorCAM-SWARF-Training
created_at: 2026-03-06
usage_count: 0
tags: ["SWARF", "5-axis", "peripheral-milling", "line-contact", "surface-finish", "aerospace", "rib-sequencing", "angle-step", "operation:pocketing", "operation:finishing", "operation:5_axis", "tool:endmill"]
material_groups: []
operation_types: ["pocketing", "finishing", "5_axis"]
content_hash: edff0cbfa433eb93db2b50b2e2a34e6468da0a281032fdb44d9339e671bccad0
mirror_ts: 2026-05-05T13:36:01.493Z
mirror_engine: TribalVaultPopulatorEngine
---

# SWARF machining: line contact vs point, 3 deg max angle step, rib-before-pocket sequencing

**Category:** `strategy` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:InventorCAM-SWARF-Training`

## Tip

SWARF (Side-Wall Axial Relief Finishing) uses tool flank (peripheral) cutting — contact is a LINE, not a point like ball-nose. This produces superior surface quality with fewer passes. Key rules: (1) Use for steep-area machining on ruled/drafted walls where flat or taper endmill rides wall with full flute contact. (2) Machine thin ribs BEFORE adjacent pockets — ribs vibrate and tear off once surrounding material removed. (3) Max angle step = 3 deg for tool axis interpolation (consistent across all SWARF ops). Larger values cause visible faceting; smaller values increase program size without proportional quality gain. (4) Separate SWARF surfaces from floor surfaces as distinct geometry inputs. (5) Corner handling: inside corners use Sharp corner strategy, outside corners use Roll around. (6) Gouge checking: use Swarf & additional surfaces with explicit check surfaces under Avoid by relinking. (7) Create separate SWARF operations per wall group (5+ semi-finish + 5+ finish is typical for aerospace) for better tool axis control per region.

## Applies to

- Operation types: `pocketing`, `finishing`, `5_axis`

## Related tips

- [[tk-dl-cam-005|SWARF machining: line contact = fewer passes + better surface]] _(category+op:2+tag:5)_
- [[tk-dl-solidcam-003|Ball nose chip thickness varies with height: near tip chips are thin (rubbing risk), use stepdown ≤ 10% of ball diameter]] _(category+op:2+tag:4)_
- [[tk-dl-sim5x-001|Sim 5-axis strategy selection: parallel, morph, geodesic, SWARF, projection + tool axis modes]] _(category+op:2+tag:4)_
- [[tk-dl-siemens-5ax-002|Siemens COMPCAD vs COMPCURV: COMPCAD for 5-axis finish, COMPCURV for 3-axis roughing]] _(category+op:2+tag:3)_
- [[tk-dl-haas-001|Haas-specific G-codes beyond standard Fanuc: G143, G150, G154, G187, G234, G254]] _(op:3+tag:4)_

## Tags

#swarf #5-axis #peripheral-milling #line-contact #surface-finish #aerospace #rib-sequencing #angle-step #operation-pocketing #operation-finishing #operation-5_axis #tool-endmill
