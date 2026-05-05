---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-001
title: Wire breakage: reduce power before increasing tension
category: troubleshooting
domain: process_engineering
knowledge_type: failure_mode
confidence: 92
source: handbook:klocke_2013_ch8
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "wire-break", "tension", "on-time", "roughing", "operation:roughing"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 40bce25fc9194a2c9877f39413e48eef3558d3faf5b59872ed9be2576f5e5e48
mirror_ts: 2026-05-05T13:36:01.192Z
mirror_engine: TribalVaultPopulatorEngine
---

# Wire breakage: reduce power before increasing tension

**Category:** `troubleshooting` · **Domain:** `process_engineering`

**Confidence:** `92` · **Source:** `handbook:klocke_2013_ch8`

## Tip

When experiencing wire breaks during roughing, reduce ON time (A/t_on) by 10-15% BEFORE increasing wire tension. High tension on a thermally weakened wire accelerates fatigue failure. Klocke (2013) shows that discharge energy is the primary wire heating mechanism — tension only matters once the wire is already near its yield point from thermal cycling. If breaks persist after ON time reduction, then increase tension by 200-300g increments.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-sp-002|Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes]] _(category+op:1+tag:2)_
- [[wedm-kb-004|Flush pressure prevents wire breaks in deep cuts]] _(category+op:1+tag:2)_
- [[wedm-kb-016|Thermal distortion in thick sections: stress relief first]] _(category+op:1+tag:2)_
- [[jm-die-019|JM Die wire break risk factors — thickness, material, corner radius, flushing]] _(category+op:1+tag:2)_
- [[wedm-kb-002|Wire breaks at corners: slow feed + increase OFF time]] _(category+op:1+tag:2)_

## Tags

#wire-edm #wire-break #tension #on-time #roughing #operation-roughing
