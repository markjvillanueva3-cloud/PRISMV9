---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-face-mill-001
title: Face milling: 45° vs 90° lead angle (+40% MRR), wiper inserts, interrupted cut rules
category: strategy
domain: document_learned
knowledge_type: rule
confidence: 90
source: document:CNCCookbook-Face-Milling-Guide
created_at: 2026-03-06
usage_count: 0
tags: ["face-milling", "lead-angle", "45-degree", "90-degree", "wiper-insert", "interrupted-cut", "chip-thinning", "MRR", "operation:milling", "tool:indexable_insert"]
material_groups: []
operation_types: ["milling"]
content_hash: 33b5fb1e8f472b0d153833ed410a7ef28fe78931bee7d27e3331b6d14bdeb954
mirror_ts: 2026-05-05T13:36:01.492Z
mirror_engine: TribalVaultPopulatorEngine
---

# Face milling: 45° vs 90° lead angle (+40% MRR), wiper inserts, interrupted cut rules

**Category:** `strategy` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:CNCCookbook-Face-Milling-Guide`

## Tip

Face milling lead angle selection: (1) 45° lead angle: chip thinning effect allows +40% higher feed rate vs 90° at same chip load, lower radial forces (better for thin-wall parts), smoother entry/exit. Trade-off: higher axial forces — requires rigid fixturing and sufficient part thickness. (2) 90° lead angle: true chip thickness = feed per tooth (no thinning correction needed), lower axial forces (better for thin parts on magnetic chuck), required when milling shoulders or steps adjacent to face. (3) Wiper insert: one wiper insert per cutter body, positioned 0.05-0.08mm below standard inserts. Wiper generates final surface — allows doubling feed rate while maintaining same Ra. Only effective at DOC < 0.8mm (above 0.8mm, regular inserts dominate surface). (4) Interrupted cutting: reduce feed 50% when >30% of cutter width is air (prevents impact shock), prefer climb milling direction for entry (thinnest chip at exit reduces breakout chipping). (5) Cutter diameter = 1.3-1.5× workpiece width for full-face coverage without re-cut.

## Applies to

- Operation types: `milling`

## Related tips

- [[tk-dl-chip-thin-001|Chip thinning: <50% radial engagement needs 2-4x feed increase, 5-flute +30% MRR]] _(category+tag:3)_
- [[tk-dl-thread-001|Thread milling: 70% diameter rule, single-point vs multi-form selection, arc entry]] _(category+op:1+tag:1)_
- [[tk-dl-cam-002|Rest machining from top-down beats pencil milling in corners]] _(category+op:1+tag:1)_
- [[tk-dl-inventorcam-hsm-001|InventorCAM HSM finishing: 17 strategies, ball nose step down = R/5, bull nose = R/3]] _(category+op:1+tag:1)_
- [[tk-dl-sim5x-001|Sim 5-axis strategy selection: parallel, morph, geodesic, SWARF, projection + tool axis modes]] _(category+op:1+tag:1)_

## Tags

#face-milling #lead-angle #45-degree #90-degree #wiper-insert #interrupted-cut #chip-thinning #mrr #operation-milling #tool-indexable_insert
