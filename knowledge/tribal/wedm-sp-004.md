---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-sp-004
title: SP43/SP64 carbide cutting: WC E-packs (5XXX series) start at Ra 51 µin — plan 4–5 passes to reach Ra 4 µin
category: machining
domain: process_engineering
knowledge_type: tip
confidence: 90
source: mastercam:makino_sp43_sp64_tech_file_mgw_s
created_at: 2026-04-14
usage_count: 0
tags: ["wire-edm", "makino", "sp43", "sp64", "carbide", "wc", "wc-co", "5xxx-epack", "ra-4", "flushing", "conductivity", "cobalt-binder", "material:P", "material:Steel", "operation:roughing", "machine:Makino"]
material_groups: ["K"]
operation_types: ["wire_edm"]
content_hash: b4241ebe8a506f8d21f2d95d57772e79c85c2c9c7355c8d6fc841c38f5ed9f62
mirror_ts: 2026-05-05T13:36:01.798Z
mirror_engine: TribalVaultPopulatorEngine
---

# SP43/SP64 carbide cutting: WC E-packs (5XXX series) start at Ra 51 µin — plan 4–5 passes to reach Ra 4 µin

**Category:** `machining` · **Domain:** `process_engineering`

**Confidence:** `90` · **Source:** `mastercam:makino_sp43_sp64_tech_file_mgw_s`

## Tip

When cutting tungsten carbide (WC or WC-Co) on the Makino SP43/SP64, the roughing E-pack Ra starts at 51 µin (1.3µm) — significantly lower than the 72 µin starting Ra for steel. This is because carbide ablates more slowly per discharge, producing a finer initial surface. The WC library (5025/5035/5045/5055/5065 rough + 52XX–52XX skims) achieves Ra 4 µin (0.10µm) in 4 passes for thicknesses up to 0.75", and 5 passes for 1.0"–1.25" sections. Offset values are slightly higher than steel at equivalent thickness due to the smaller spark gap on carbide (lower conductivity requires slightly larger compensation). Flushing note: use deionized water conductivity ≤ 5 µS/cm for carbide — higher conductivity causes electrolytic attack on the cobalt binder, creating subsurface micro-cracks invisible to surface inspection. Check conductivity every 4 hours when running long carbide programs.

## Applies to

- Material groups: `K`
- Operation types: `wire_edm`

## Related tips

- [[jm-die-012|JM Die tungsten carbide — zinc-coated wire mandatory, E952+E56xx ACU sequence]] _(category+material:1+op:1+tag:6)_
- [[wedm-sp-006|SP43/SP64 copper (Cu) library: 3-pass High Precision achieves Ra 12 µin — use for electrode and fixture cutting]] _(category+op:1+tag:8)_
- [[wedm-sp-003|SP43/SP64 High Precision vs Both Away: choose High Precision for ±0.0001" tolerance, Both Away for form accuracy]] _(category+op:1+tag:7)_
- [[wedm-mcam-004|Both Away Precision beats High Speed for die work: 2~2.5µm Ra in 5 passes on Makino DUO]] _(category+op:1+tag:6)_
- [[wedm-sp-001|Makino SP43/SP64: 0.004" wire enables min inside radius of ~0.003" — use for intricate die profiles]] _(category+op:1+tag:5)_

## Tags

#wire-edm #makino #sp43 #sp64 #carbide #wc #wc-co #5xxx-epack #ra-4 #flushing #conductivity #cobalt-binder #material-p #material-steel #operation-roughing #machine-makino
