---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-017
title: Taper cutting: verify UV zero offset before every job
category: setup
subcategory: alignment
domain: controller_specific
knowledge_type: anti_pattern
confidence: 90
source: handbook:mitsubishi_fa_app_notes
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "taper", "uv-axis", "alignment", "calibration", "machine:Mitsubishi"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 38827531892fca60246e4d24764045b752dcf1c02941ff1e421254941559ce10
mirror_ts: 2026-05-05T13:36:01.797Z
mirror_engine: TribalVaultPopulatorEngine
---

# Taper cutting: verify UV zero offset before every job

**Category:** `setup` · **Subcategory:** `alignment` · **Domain:** `controller_specific`

**Confidence:** `90` · **Source:** `handbook:mitsubishi_fa_app_notes`

## Tip

Before any taper cut, verify U=0 V=0 produces a straight cut. A UV offset error of even 0.01mm translates to a taper error across the full workpiece thickness. Run a 25mm test cut in scrap material and measure top vs bottom — they should match within 0.005mm. If they don't, the UV guides need alignment. Most Mitsubishi machines have a UV alignment macro in the maintenance menu.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-005|JM Die Mitsubishi FA startup sequence — M78-M80-M82-M84 then M20]] _(category+op:1+tag:2)_
- [[jm-die-015|JM Die program shutdown sequence — M21-M85-M83-M81-M79 then M02]] _(category+op:1+tag:2)_
- [[wedm-kb-022|Flush nozzle alignment: 0.5mm gap to workpiece surface]] _(category+op:1+tag:2)_
- [[bc-156|BobCAD Wire EDM Multi-Pass Technology Table Management]] _(category+op:1+tag:2)_
- [[jm-die-001|JM Die H175 master offset convention — use H175 as the primary offset base]] _(category+op:1+tag:1)_

## Tags

#wire-edm #taper #uv-axis #alignment #calibration #machine-mitsubishi
