---
schema_version: 1.0.0
kind: tribal_tip
id: TK-VL-post-003
title: Lathe post-processor: Mach3/4 Fusion 360 turn post requires G18 (XZ plane) and G95 (feed/rev)
category: programming
subcategory: post_processor
domain: video_learned
knowledge_type: rule
confidence: 82
source: video:bNBSLE0KbcU@60s
created_at: 2026-03-06
usage_count: 0
tags: ["lathe", "post-processor", "Mach3", "Mach4", "Fusion-360", "G18", "G95", "turning", "operation:finishing", "operation:turning", "tool:unknown", "controller:generic"]
material_groups: []
operation_types: ["finishing", "turning"]
content_hash: 9e225715ccad71b2b26efb33b6329dc27858af6e4ed05520d7d0e14e15fb986c
mirror_ts: 2026-05-05T13:36:03.783Z
mirror_engine: TribalVaultPopulatorEngine
---

# Lathe post-processor: Mach3/4 Fusion 360 turn post requires G18 (XZ plane) and G95 (feed/rev)

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `video_learned`

**Confidence:** `82` · **Source:** `video:bNBSLE0KbcU@60s`

## Tip

When setting up a lathe post for Mach3/Mach4 from Fusion 360: (1) G18 (XZ plane) MUST be in the safe start block — Mach defaults to G17 (XY) which causes arc errors on turning profiles, (2) Use G95 (feed per revolution) not G94 (feed per minute) for turning — G94 causes inconsistent surface finish as diameter changes, (3) Lead-in/lead-out settings in Fusion 360 turning operations can produce unexpected G02/G03 arcs at small diameters — disable or reduce to 0.1mm for finishing passes under 10mm diameter, (4) Tool orientation numbers must match your turret — Mach3/4 doesn't auto-map orientations, so T0101 vs T0103 matters for TNRC direction.

## Applies to

- Operation types: `finishing`, `turning`

## Related tips

- [[ctrl-154|Fanuc thread cutting — G32, G92, G76 comparison]] _(category+op:2+tag:4)_
- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:2+tag:4)_
- [[ctrl-174|Mazak Integrex threading — G292/G276 vs QTU G92/G76]] _(category+op:2+tag:3)_
- [[tk-dl-gcode-css-001|G96 CSS: RPM = (SFM × 12) / (π × diameter), G50 S-clamp prevents spindle overspeed]] _(category+op:2+tag:3)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:2+tag:3)_

## Tags

#lathe #post-processor #mach3 #mach4 #fusion-360 #g18 #g95 #turning #operation-finishing #operation-turning #tool-unknown #controller-generic
