---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-018
title: Maximum taper angle depends on workpiece thickness
category: machining
domain: process_engineering
knowledge_type: anti_pattern
confidence: 87
source: handbook:mitsubishi_fa_app_notes
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "taper", "uv-axis", "maximum-angle", "guide-gap", "machine:Mitsubishi"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 53e55021b4f13946eb52a644617540dfa3431e550d25d36087a03f1ca5134dd0
mirror_ts: 2026-05-05T13:36:02.891Z
mirror_engine: TribalVaultPopulatorEngine
---

# Maximum taper angle depends on workpiece thickness

**Category:** `machining` · **Domain:** `process_engineering`

**Confidence:** `87` · **Source:** `handbook:mitsubishi_fa_app_notes`

## Tip

WEDM taper is limited by the machine's UV travel and the distance between upper and lower guides. Maximum taper angle = atan(UV_max_travel / guide_gap). For a typical Mitsubishi FA20S with ±30mm UV travel and 350mm guide gap: max taper ≈ ±5°. For larger tapers, reduce the guide gap by raising the lower guide. WARNING: reducing guide gap below 100mm + workpiece thickness risks collision. Always verify clearance with dry run (G0 only, no wire).

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-004|JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825]] _(category+op:1+tag:4)_
- [[wedm-kb-020|UV taper only on G1 lines — G2/G3 arcs are straight]] _(category+op:1+tag:3)_
- [[jm-die-018|JM Die NOZE TEST pattern — 4-axis UV taper benchmark program]] _(category+op:1+tag:3)_
- [[wedm-sp-001|Makino SP43/SP64: 0.004" wire enables min inside radius of ~0.003" — use for intricate die profiles]] _(category+op:1+tag:2)_
- [[jm-die-002|JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224]] _(category+op:1+tag:2)_

## Tags

#wire-edm #taper #uv-axis #maximum-angle #guide-gap #machine-mitsubishi
