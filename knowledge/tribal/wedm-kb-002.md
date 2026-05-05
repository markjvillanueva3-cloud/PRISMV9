---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-002
title: Wire breaks at corners: slow feed + increase OFF time
category: troubleshooting
domain: controller_specific
knowledge_type: workaround
confidence: 90
source: handbook:mitsubishi_fa_app_notes
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "wire-break", "corner", "sharp-corner", "feed-rate", "machine:Mitsubishi"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 7a5abe047f70ff9285162f71ba2744202d838dbb1de4e8ac4dd9e06124c16493
mirror_ts: 2026-05-05T13:36:01.794Z
mirror_engine: TribalVaultPopulatorEngine
---

# Wire breaks at corners: slow feed + increase OFF time

**Category:** `troubleshooting` · **Domain:** `controller_specific`

**Confidence:** `90` · **Source:** `handbook:mitsubishi_fa_app_notes`

## Tip

Wire breaks frequently at sharp inside corners (<R0.5mm) because the wire bends around the corner while discharge energy concentrates on a smaller area. Mitigations: (1) Add corner slowdown — reduce feed to 60% at corners with radius < 2× wire diameter. (2) Increase OFF time (B) by 20-30% in corner segments. (3) Consider 0.20mm wire instead of 0.25mm for tight radii. Mitsubishi FA controllers have automatic corner control (CC) that adjusts power at corners.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-019|JM Die wire break risk factors — thickness, material, corner radius, flushing]] _(category+op:1+tag:3)_
- [[wedm-kb-003|Wire break recovery: re-thread 2mm behind break point]] _(category+op:1+tag:3)_
- [[wedm-sp-002|Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes]] _(category+op:1+tag:2)_
- [[wedm-kb-004|Flush pressure prevents wire breaks in deep cuts]] _(category+op:1+tag:2)_
- [[wedm-kb-001|Wire breakage: reduce power before increasing tension]] _(category+op:1+tag:2)_

## Tags

#wire-edm #wire-break #corner #sharp-corner #feed-rate #machine-mitsubishi
