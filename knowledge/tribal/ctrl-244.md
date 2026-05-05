---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-244
title: JM Die Haas arc programming — G2/G3 with I/J center offsets
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: correction
confidence: 96
source: shop:jm_die_cnc_mill_haas_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "haas", "ngc", "arc", "g2", "g3", "ij-offset", "incremental", "radius", "circle", "operation:milling", "operation:chamfering", "machine:Haas"]
material_groups: []
operation_types: ["milling", "chamfering"]
content_hash: 2e27e59d3c0a3a04677dfc86bc7a057c8f0dfc28339c76de50905a7cafd3e5c8
mirror_ts: 2026-05-05T13:36:00.829Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die Haas arc programming — G2/G3 with I/J center offsets

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `96` · **Source:** `shop:jm_die_cnc_mill_haas_programs`

## Tip

JM Die Haas mill arcs use I/J incremental center offsets: G3 X.388 Y.0537 I-.0537 J0. F15. (CCW arc, center offset from start point). I = incremental X distance from start to center, J = incremental Y distance from start to center. For full circles: start and end at same point with correct I/J. Example chamfer radius: G3 X.4417 Y0. I0. J.0537 blends a fillet. JM Die programs typically use R-word for simple radii (G3 X1.9642 Y-0.9843 R0.1925) and I/J for partial arcs where R-word ambiguity could select wrong arc. CRITICAL: I/J mode is set by G91.1 (incremental) vs G90.1 (absolute) — JM Die uses incremental (default).

## Applies to

- Operation types: `milling`, `chamfering`

## Related tips

- [[ctrl-229|JM Die Haas mill program header — standard safety line and tool documentation]] _(category+op:1+tag:5)_
- [[ctrl-230|JM Die Haas G99 canned cycles — retract to R-plane for multiple hole operations]] _(category+op:1+tag:5)_
- [[ctrl-198|Haas G150 general pocket milling — mandatory pre-drill and subprogram boundary format]] _(category+op:1+tag:5)_
- [[ctrl-197|Haas M138/M139 Spindle Speed Variation — chatter suppression without hardware]] _(category+op:1+tag:4)_
- [[ctrl-154|Fanuc thread cutting — G32, G92, G76 comparison]] _(category+op:2+tag:2)_

## Tags

#jm-die #haas #ngc #arc #g2 #g3 #ij-offset #incremental #radius #circle #operation-milling #operation-chamfering #machine-haas
