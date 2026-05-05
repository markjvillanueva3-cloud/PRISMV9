---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-sp-006
title: SP43/SP64 copper (Cu) library: 3-pass High Precision achieves Ra 12 µin — use for electrode and fixture cutting
category: machining
domain: process_engineering
knowledge_type: tip
confidence: 87
source: mastercam:makino_sp43_sp64_tech_file_mgw_s
created_at: 2026-04-14
usage_count: 0
tags: ["wire-edm", "makino", "sp43", "sp64", "copper", "cu", "7xxx-epack", "3-pass", "electrode", "sinker-edm", "graphite", "ra-12", "material:P", "material:Steel", "material:N", "material:copper", "operation:roughing", "operation:finishing", "operation:edm", "machine:Makino"]
material_groups: ["P", "N"]
operation_types: ["wire_edm"]
content_hash: 0203b60b1b74710522bf874c06a16ad92b1873905478e603753615bff32dc059
mirror_ts: 2026-05-05T13:36:02.892Z
mirror_engine: TribalVaultPopulatorEngine
---

# SP43/SP64 copper (Cu) library: 3-pass High Precision achieves Ra 12 µin — use for electrode and fixture cutting

**Category:** `machining` · **Domain:** `process_engineering`

**Confidence:** `87` · **Source:** `mastercam:makino_sp43_sp64_tech_file_mgw_s`

## Tip

The Makino SP43/SP64 includes a dedicated Cu (copper) E-pack library (7XXX series: 7025/7035/7045/7055/7065 roughing + 72XX skims) for cutting copper electrodes for sinker EDM. Unlike the steel and carbide libraries which support 4–5 passes, the copper library completes in 3 passes, achieving Ra 12 µin (0.30µm) — sufficient for EDM electrode surface finish requirements. The copper roughing Ra is 72 µin (same as steel), but the final skim offsets are smaller (0.0023–0.0024" vs 0.0022–0.0023" for steel), reflecting the softer material's lower spark gap requirement. Practical use at shops like JM Die: use the Cu library when cutting profiled copper or brass fixtures, die-set components, or graphite EDM electrodes if the machine's WC library is not applicable (note: graphite is not in the SP43/SP64 library — use steel parameters as a starting point for graphite, derated by 30% on roughing power). Cu library is NOT appropriate for steel die cavities regardless of copper-colored surface coatings.

## Applies to

- Material groups: `P`, `N`
- Operation types: `wire_edm`

## Related tips

- [[wedm-sp-001|Makino SP43/SP64: 0.004" wire enables min inside radius of ~0.003" — use for intricate die profiles]] _(category+material:1+op:1+tag:7)_
- [[wedm-sp-003|SP43/SP64 High Precision vs Both Away: choose High Precision for ±0.0001" tolerance, Both Away for form accuracy]] _(category+material:1+op:1+tag:7)_
- [[wedm-mcam-004|Both Away Precision beats High Speed for die work: 2~2.5µm Ra in 5 passes on Makino DUO]] _(category+material:1+op:1+tag:6)_
- [[wedm-sp-004|SP43/SP64 carbide cutting: WC E-packs (5XXX series) start at Ra 51 µin — plan 4–5 passes to reach Ra 4 µin]] _(category+op:1+tag:8)_
- [[wedm-sp-002|Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes]] _(material:1+op:1+tag:9)_

## Tags

#wire-edm #makino #sp43 #sp64 #copper #cu #7xxx-epack #3-pass #electrode #sinker-edm #graphite #ra-12 #material-p #material-steel #material-n #material-copper #operation-roughing #operation-finishing #operation-edm #machine-makino
