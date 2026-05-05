---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-sp-001
title: Makino SP43/SP64: 0.004' wire enables min inside radius of ~0.003' — use for intricate die profiles
category: machining
domain: process_engineering
knowledge_type: tip
confidence: 95
source: mastercam:makino_sp43_sp64_tech_file_mgw_s
created_at: 2026-04-14
usage_count: 0
tags: ["wire-edm", "makino", "sp43", "sp64", "mgw-s", "0.004-wire", "fine-wire", "inside-radius", "die-work", "intricate", "material:N", "material:brass", "operation:edm", "machine:Makino", "machine:Mitsubishi", "tool:bull_nose_endmill"]
material_groups: ["N"]
operation_types: ["wire_edm"]
content_hash: 5b0b15fe66cfe0d187e11885b9855ace5f3afce007dde1f30237a08f4c5252a7
mirror_ts: 2026-05-05T13:36:00.889Z
mirror_engine: TribalVaultPopulatorEngine
---

# Makino SP43/SP64: 0.004" wire enables min inside radius of ~0.003" — use for intricate die profiles

**Category:** `machining` · **Domain:** `process_engineering`

**Confidence:** `95` · **Source:** `mastercam:makino_sp43_sp64_tech_file_mgw_s`

## Tip

The Makino SP43 and SP64 use 0.004" (0.10mm) brass wire as the standard library wire — half the diameter of the 0.008" (0.20mm) wire used on most Makino DUO and Mitsubishi FA-10S machines. This enables a minimum programmed inside corner radius of approximately 0.003" (0.076mm), compared to ~0.006" on 0.008" wire machines. Practical consequence: SP43/SP64 can cut wire guide dies, extrusion nozzles, and fine-blanking punches with inside radii that would require secondary EDM sinking or hand lapping on coarser-wire machines. Programming note: always set the lead-in to at least 2× wire diameter (0.008" min) and use straight leads, never arcs, to avoid compensation singularities at entry.

## Applies to

- Material groups: `N`
- Operation types: `wire_edm`

## Related tips

- [[wedm-sp-006|SP43/SP64 copper (Cu) library: 3-pass High Precision achieves Ra 12 µin — use for electrode and fixture cutting]] _(category+material:1+op:1+tag:7)_
- [[wedm-kb-015|Maximum practical WEDM thickness depends on wire type]] _(category+material:1+op:1+tag:4)_
- [[wedm-mcam-005|Mitsubishi FA-S ACU 7-pass: use only when Ra < 0.18µm (7 µin) is required]] _(category+op:1+tag:5)_
- [[wedm-sp-003|SP43/SP64 High Precision vs Both Away: choose High Precision for ±0.0001" tolerance, Both Away for form accuracy]] _(category+op:1+tag:5)_
- [[wedm-sp-004|SP43/SP64 carbide cutting: WC E-packs (5XXX series) start at Ra 51 µin — plan 4–5 passes to reach Ra 4 µin]] _(category+op:1+tag:5)_

## Tags

#wire-edm #makino #sp43 #sp64 #mgw-s #0-004-wire #fine-wire #inside-radius #die-work #intricate #material-n #material-brass #operation-edm #machine-makino #machine-mitsubishi #tool-bull_nose_endmill
