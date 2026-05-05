---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-mc-wire-01
title: Wire EDM overburn decreases per skim pass
category: machining
domain: document_learned
knowledge_type: tip
confidence: 85
source: document:mastercam_wire_tutorial@ch1-2
created_at: 2026-03-01
usage_count: 0
tags: ["wire-edm", "overburn", "skim-cut", "offset", "wire", "material:N", "material:brass", "operation:edm"]
material_groups: ["N"]
operation_types: ["edm"]
content_hash: 54cdddb571ff21ee1e771072685bb1f3827d43221e337ffc8fa09842f21a36f2
mirror_ts: 2026-05-05T13:36:03.182Z
mirror_engine: TribalVaultPopulatorEngine
---

# Wire EDM overburn decreases per skim pass

**Category:** `machining` · **Domain:** `document_learned`

**Confidence:** `85` · **Source:** `document:mastercam_wire_tutorial@ch1-2`

## Tip

Overburn (the extra material removed beyond the wire path) decreases with each skim pass. Typical progression for brass 0.25mm wire: first cut 0.035mm, skim 1 = 0.020mm, skim 2 = 0.010mm, skim 3 = 0.000mm (zero overburn). Each pass uses lower power and slower speed. Program total offset = wire_radius + overburn for each pass. Source: Mastercam Wire Tutorial Ch.1-2.

## Applies to

- Material groups: `N`
- Operation types: `edm`

## Related tips

- [[wedm-sp-001|Makino SP43/SP64: 0.004" wire enables min inside radius of ~0.003" — use for intricate die profiles]] _(category+material:1+tag:4)_
- [[wedm-kb-015|Maximum practical WEDM thickness depends on wire type]] _(category+material:1+tag:4)_
- [[tk-dl-mc-wire-03|Wire EDM lead-in/lead-out geometry for burr-free cuts]] _(category+op:1+tag:3)_
- [[wedm-sp-006|SP43/SP64 copper (Cu) library: 3-pass High Precision achieves Ra 12 µin — use for electrode and fixture cutting]] _(category+material:1+tag:3)_
- [[tk-dl-mc-wire-05|Reverse wire cutting eliminates re-threading]] _(category+op:1+tag:3)_

## Tags

#wire-edm #overburn #skim-cut #offset #wire #material-n #material-brass #operation-edm
