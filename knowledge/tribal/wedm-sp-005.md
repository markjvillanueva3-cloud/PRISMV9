---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-sp-005
title: SP43/SP64 flushing: upper and lower nozzle standoff is critical — maintain ≤ 0.010' gap
category: setup
domain: process_engineering
knowledge_type: tip
confidence: 88
source: mastercam:makino_sp43_sp64_tech_file_mgw_s
created_at: 2026-04-14
usage_count: 0
tags: ["wire-edm", "makino", "sp43", "sp64", "mgw-s", "flushing", "nozzle-standoff", "coaxial-flush", "wire-break", "submerged", "immersion", "machine:Makino"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: eaf1f9e9d36ef441bc423b3bcb553319c7da1ce939a941888deb93c02a109f8a
mirror_ts: 2026-05-05T13:36:02.546Z
mirror_engine: TribalVaultPopulatorEngine
---

# SP43/SP64 flushing: upper and lower nozzle standoff is critical — maintain ≤ 0.010" gap

**Category:** `setup` · **Domain:** `process_engineering`

**Confidence:** `88` · **Source:** `mastercam:makino_sp43_sp64_tech_file_mgw_s`

## Tip

The Makino SP43/SP64 with 0.004" wire uses very small upper and lower flushing nozzles. The nozzle standoff (distance from nozzle face to workpiece surface) must be ≤ 0.010" (0.25mm) to maintain adequate coaxial flush pressure around the 0.004" wire. With the MGW-S control, flushing pressure is set automatically by the E-pack condition — the operator only needs to verify nozzle position. Symptoms of excessive standoff: wire breaks in the middle of long straight cuts (not at corners), inconsistent Ra from top to bottom of the cut, and visible debris accumulation in the cut kerf. For interrupted surfaces (holes, slots, or stepped workpieces), use the machine's broken-surface flushing mode — on MGW-S this is activated via the C-cycle parameter. Do NOT use standard nozzle-flush on workpieces with openings larger than 0.5" in the flushing path — use submerged (immersion) cutting instead.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-kb-021|Submerged vs non-submerged: always submerge when possible]] _(category+op:1+tag:4)_
- [[wedm-sp-001|Makino SP43/SP64: 0.004" wire enables min inside radius of ~0.003" — use for intricate die profiles]] _(op:1+tag:6)_
- [[wedm-sp-004|SP43/SP64 carbide cutting: WC E-packs (5XXX series) start at Ra 51 µin — plan 4–5 passes to reach Ra 4 µin]] _(op:1+tag:6)_
- [[wedm-kb-022|Flush nozzle alignment: 0.5mm gap to workpiece surface]] _(category+op:1+tag:2)_
- [[wedm-sp-002|Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes]] _(op:1+tag:5)_

## Tags

#wire-edm #makino #sp43 #sp64 #mgw-s #flushing #nozzle-standoff #coaxial-flush #wire-break #submerged #immersion #machine-makino
