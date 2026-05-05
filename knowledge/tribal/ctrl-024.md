---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-024
title: Haas NGC unique M-codes reference
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: tip
confidence: 93
source: controller:haas_programming_guide
created_at: 2026-03-07
usage_count: 0
tags: ["haas", "ngc", "m-codes", "tsc", "pallet", "unique", "machine:Haas", "controller:fanuc", "controller:haas"]
material_groups: []
operation_types: []
content_hash: 4a7a851e2fc040751d39b6e8ef6dacbdb39cc4edb3dbc0914fddb442a5b13c8c
mirror_ts: 2026-05-05T13:36:00.965Z
mirror_engine: TribalVaultPopulatorEngine
---

# Haas NGC unique M-codes reference

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `93` · **Source:** `controller:haas_programming_guide`

## Tip

Haas-specific M-codes not found on other Fanuc-based controls: M36/M37 (pallet change), M50 (pallet clamp), M51/M52 (part catcher), M88/M89 (TSC on/off), M93 (air blast), M96/M97 (local subroutine branch on skip signal — unique to Haas, not in Fanuc spec). M109 (interactive user input). M99 P-line (skip to line number — Haas-specific behavior).

## Related tips

- [[ctrl-196|Haas G154 P1-P99 extended work offsets — pallet and tombstone programming]] _(category+tag:6)_
- [[ctrl-022|Haas NGC Setting 191 for smoothing tolerance]] _(category+tag:5)_
- [[ctrl-023|Haas macro variables and probing]] _(category+tag:5)_
- [[ctrl-190|Haas NGC Setting 130 — tapping feed mode and G95 IPR best practice]] _(category+tag:4)_
- [[ctrl-189|Haas G187 P-level and E-tolerance — complete smoothing guide]] _(category+tag:4)_

## Tags

#haas #ngc #m-codes #tsc #pallet #unique #machine-haas #controller-fanuc #controller-haas
