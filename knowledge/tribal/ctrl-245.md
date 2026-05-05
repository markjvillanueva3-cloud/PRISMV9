---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-245
title: JM Die Okuma L-word radius — arc programming shorthand
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: rule
confidence: 95
source: shop:jm_die_cnc_lathe_programs
created_at: 2026-04-14
usage_count: 0
tags: ["jm-die", "okuma", "osp", "l-word", "radius", "arc", "g2", "g3", "lathe", "profile", "operation:turning", "machine:Okuma"]
material_groups: []
operation_types: ["turning"]
content_hash: 038f7f29857d04be49ffa8e9470c7a7dac2006c71c171f9f84f9cfc5c13aebf2
mirror_ts: 2026-05-05T13:36:00.885Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die Okuma L-word radius — arc programming shorthand

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `95` · **Source:** `shop:jm_die_cnc_lathe_programs`

## Tip

Okuma lathe arcs use L-word for radius: G3 X.583 Z-.02 L.02 (CCW arc with 0.020 radius). The L-word is Okuma's equivalent to the R-word on other controllers. Positive L = smaller arc (<180 deg), negative L = larger arc (>180 deg). JM Die uses L-word extensively for blend radii on die profiles: transitions between straight sections, fillet radii on internal features, radius blends at the base of punches. For profiles requiring exact center point control: use I/K syntax instead (G3 X_ Z_ I_ K_). L-word is cleaner for simple known-radius features; I/K is required for full circles or specific arc geometry.

## Applies to

- Operation types: `turning`

## Related tips

- [[ctrl-225|JM Die Okuma lathe program structure — NAT subroutines with bar feeder loop]] _(category+op:1+tag:6)_
- [[ctrl-226|JM Die Okuma G85/G87 canned roughing and finishing — pattern turning cycles]] _(category+op:1+tag:6)_
- [[ctrl-227|JM Die Okuma G74 peck drilling on lathe — deep hole drilling cycle]] _(category+op:1+tag:6)_
- [[ctrl-242|JM Die Okuma 6-digit tool format — turret position and geometry offsets]] _(category+op:1+tag:6)_
- [[ctrl-243|JM Die chamfer programming — A-word angles on Okuma lathe]] _(category+op:1+tag:6)_

## Tags

#jm-die #okuma #osp #l-word #radius #arc #g2 #g3 #lathe #profile #operation-turning #machine-okuma
