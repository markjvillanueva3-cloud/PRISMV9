---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cam-003
title: HSM requires smooth links — minimize retracts to high Z
category: strategy
domain: document_learned
knowledge_type: tip
confidence: 88
source: document:inventorcam-3d-hsm@ch7
created_at: 2026-03-03
usage_count: 0
tags: ["hsm", "linking", "retract", "air-cutting", "feed-rate", "operation:hsm"]
material_groups: []
operation_types: ["hsm"]
content_hash: 73da4a0aa4a533b831a347d1e4c61456979ffc22b711439d5fded473592a68b8
mirror_ts: 2026-05-05T13:36:02.141Z
mirror_engine: TribalVaultPopulatorEngine
---

# HSM requires smooth links — minimize retracts to high Z

**Category:** `strategy` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:inventorcam-3d-hsm@ch7`

## Tip

High-speed machining demands continuous machine motion. Retracts to safe Z between passes kill feed rate and create dwell marks. HSM linking strategies: (1) stay on surface within tolerance, (2) stay down within clearance, (3) angle retracts rather than vertical, (4) smooth with arcs. Every retract to safe Z adds 2-5 seconds of non-cutting time.

## Applies to

- Operation types: `hsm`

## Related tips

- [[tk-dl-haas-003|Haas HSM: Acceleration Before Interpolation + full look-ahead, 1200 ipm contour]] _(category+op:1+tag:1)_
- [[tk-dl-inventorcam-hsm-001|InventorCAM HSM finishing: 17 strategies, ball nose step down = R/5, bull nose = R/3]] _(category+op:1+tag:1)_
- [[tk-dl-inventorcam-hsr-001|InventorCAM HSR roughing: 5 strategies, iMachining adaptive, Hybrid Rib for thin walls]] _(category+op:1+tag:1)_
- [[tk-dl-sim5x-001|Sim 5-axis strategy selection: parallel, morph, geodesic, SWARF, projection + tool axis modes]] _(category+op:1+tag:1)_
- [[tk-dl-fusion-002|Adaptive clearing chip thinning: factor = 1/√(1-(1-2ae/D)²), Fusion360 auto-adjusts feed in HSM]] _(category+op:1+tag:1)_

## Tags

#hsm #linking #retract #air-cutting #feed-rate #operation-hsm
