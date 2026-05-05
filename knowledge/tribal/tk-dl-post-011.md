---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-post-011
title: G98 vs G99 canned cycle return: G98 to initial Z (safe), G99 to R-plane (fast)
category: programming
subcategory: sub_program
domain: document_learned
knowledge_type: rule
confidence: 90
source: document:cnccookbook-g98-g99@return-modes
created_at: 2026-03-06
usage_count: 0
tags: ["g98", "g99", "canned-cycle", "retract", "r-plane", "initial-z", "mill-vs-lathe"]
material_groups: []
operation_types: []
content_hash: d0ec8f7b286be63eda8d685512fbb34d00d87ddb27ec4a99cfb528daee296620
mirror_ts: 2026-05-05T13:36:01.480Z
mirror_engine: TribalVaultPopulatorEngine
---

# G98 vs G99 canned cycle return: G98 to initial Z (safe), G99 to R-plane (fast)

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:cnccookbook-g98-g99@return-modes`

## Tip

On mills, G98 retracts to the initial Z position (where the tool was when the cycle started) after each hole — safe for obstacles between holes. G99 retracts only to the R-plane (closer to the workpiece) — faster for flat surfaces with no obstacles. Use G98 when there are clamps, fixtures, or height variations between holes. Use G99 for flat plates where R-plane clearance is sufficient. On lathes, G98/G99 mean something completely different: G98 = feed per minute, G99 = feed per revolution — always check which machine type when reading programs.

## Related tips

- [[ctrl-230|JM Die Haas G99 canned cycles — retract to R-plane for multiple hole operations]] _(category+tag:2)_
- [[ctrl-206|Mitsubishi turning G-code list types 2-7: feed mode and spindle speed limit differences]] _(category+tag:2)_
- [[ctrl-211|Hurco WinMax M140 — retract along current tool vector to machine limits]] _(category+tag:1)_
- [[ctrl-160|Siemens 840D TRAFOOF — safely cancelling 5-axis TCP transformation]] _(category+tag:1)_
- [[ctrl-212|Hurco WinMax G53 Z0 vs G91 G28 Z0 — machine coordinate retract]] _(category+tag:1)_

## Tags

#g98 #g99 #canned-cycle #retract #r-plane #initial-z #mill-vs-lathe
