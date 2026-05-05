---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-mcam-005
title: No Core toolpath removes material without slugs — zigzag or spiral cutting
category: machining
domain: cam_software
knowledge_type: tip
confidence: 87
source: mastercam_wire_tutorial:page33
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "no-core", "slug-free", "zigzag", "spiral", "slot", "mastercam", "cavity"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 54f41733590c3195f52c179eea893da02341130eaa275195199a3a577ddb4383
mirror_ts: 2026-05-05T13:36:38.378Z
mirror_engine: TribalVaultPopulatorEngine
---

# No Core toolpath removes material without slugs — zigzag or spiral cutting

**Category:** `machining` · **Domain:** `cam_software`

**Confidence:** `87` · **Source:** `mastercam_wire_tutorial:page33`

## Tip

No Core toolpaths in Mastercam Wire remove all material within a boundary without producing slugs or slivers. The wire starts at a pre-drilled hole and zigzags or spirals outward until all material is removed. Six cutting methods available: (1) Parallel Spiral — follows part shape, good for slots. (2) One Way — linear passes in one direction. (3) Zigzag — alternating linear passes. (4) Zig One Way — zigzag with lifts between passes. (5) Spiral — continuous inward/outward spiral. (6) Morph Spiral — blend between shapes. Use No Core for: slotted features where slug dropout is impossible, thin ribs where slugs can't be removed, or when full cavity clearance is needed without manual slug extraction.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-mcam-002|Reverse cutting method eliminates re-threading between passes]] _(category+op:1+tag:2)_
- [[wedm-mcam-009|Tab with skim cuts after — efficient multi-contour slug management]] _(category+op:1+tag:2)_
- [[wedm-sp-001|Makino SP43/SP64: 0.004" wire enables min inside radius of ~0.003" — use for intricate die profiles]] _(category+op:1+tag:1)_
- [[wedm-jmd-004|Glue stop M01 between closed contours: JM Die slug control practice]] _(category+op:1+tag:1)_
- [[wedm-mcam-004|Both Away Precision beats High Speed for die work: 2~2.5µm Ra in 5 passes on Makino DUO]] _(category+op:1+tag:1)_

## Tags

#wire-edm #no-core #slug-free #zigzag #spiral #slot #mastercam #cavity
