---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-007
title: Ra worse than expected: check water resistivity first
category: troubleshooting
domain: process_engineering
knowledge_type: tip
confidence: 94
source: handbook:klocke_2013_ch8
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "surface-finish", "Ra", "water-resistivity", "dielectric", "deionizer", "operation:finishing"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 8be6615fce8f6861beb55cc710c20a545cba47de86305c9ca89a9f57e92ea951
mirror_ts: 2026-05-05T13:36:00.928Z
mirror_engine: TribalVaultPopulatorEngine
---

# Ra worse than expected: check water resistivity first

**Category:** `troubleshooting` · **Domain:** `process_engineering`

**Confidence:** `94` · **Source:** `handbook:klocke_2013_ch8`

## Tip

If surface finish (Ra) is 20-50% worse than predicted, check the dielectric water resistivity FIRST. Optimal range for finishing: 5-15 MΩ·cm (deionized). Resistivity below 3 MΩ·cm causes unstable discharges with irregular crater sizes → worse Ra. The deionizing resin needs replacement when resistivity drops below 3 MΩ·cm under load. Most machines have a resistivity gauge on the tank — check it before adjusting E-pack parameters.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-sp-002|Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes]] _(category+op:1+tag:2)_
- [[wedm-kb-004|Flush pressure prevents wire breaks in deep cuts]] _(category+op:1+tag:1)_
- [[wedm-kb-001|Wire breakage: reduce power before increasing tension]] _(category+op:1+tag:1)_
- [[wedm-kb-016|Thermal distortion in thick sections: stress relief first]] _(category+op:1+tag:1)_
- [[jm-die-019|JM Die wire break risk factors — thickness, material, corner radius, flushing]] _(category+op:1+tag:1)_

## Tags

#wire-edm #surface-finish #ra #water-resistivity #dielectric #deionizer #operation-finishing
