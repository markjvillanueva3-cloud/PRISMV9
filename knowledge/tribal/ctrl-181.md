---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-181
title: Okuma G284 — OSP-native rigid tapping cycle, no M29 synchronization required
category: programming
subcategory: cam_strategy
domain: cam_software
knowledge_type: anti_pattern
confidence: 95
source: controller:okuma_osp_p300_programming_manual
created_at: 2026-04-15
usage_count: 0
tags: ["okuma", "osp", "tapping", "g284", "g84", "g274", "rigid-tapping", "no-m29", "post-processor", "operation:tapping", "machine:Okuma", "controller:fanuc"]
material_groups: []
operation_types: ["tapping"]
content_hash: 5105164a26b09327996a7065d7cdfdae675df0fcee4f2c5f6cea49476c8620f3
mirror_ts: 2026-05-05T13:36:00.867Z
mirror_engine: TribalVaultPopulatorEngine
---

# Okuma G284 — OSP-native rigid tapping cycle, no M29 synchronization required

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `cam_software`

**Confidence:** `95` · **Source:** `controller:okuma_osp_p300_programming_manual`

## Tip

Okuma OSP supports both G84 (Fanuc-compatible) and the OSP-native G284 for rigid tapping. G284 is recommended on all P300/P500. Critical difference from Fanuc: OSP does NOT require M29 (rigid mode select) before G84 or G284 — synchronization is internal to the cycle. G284 syntax: G284 X_ Y_ Z_ R_ F_ (all absolute, identical parameters to G84). Feedrate = pitch × RPM. Example: M6×1.0 at 800 RPM → F800.0. G284 enables in posts: Autodesk Fusion property 'Use G284' = true; Mastercam: rigid_tap_code$ = 284 in .PST file. For left-hand threads: use G274 (OSP native) instead of G74. If posting programs that run on both Okuma OSP and Fanuc machines, use G84 (works on both) and do not output M29 — OSP ignores M29 gracefully but outputs a warning on some versions.

## Applies to

- Operation types: `tapping`

## Related tips

- [[ctrl-190|Haas NGC Setting 130 — tapping feed mode and G95 IPR best practice]] _(category+op:1+tag:4)_
- [[ctrl-010|Fanuc rigid tapping G84 with synchronization]] _(category+op:1+tag:4)_
- [[ctrl-208|Mitsubishi rigid tapping ,R1 syntax and program number reservation ranges]] _(category+op:1+tag:4)_
- [[ctrl-180|Okuma OSP work offset format: G15 H## is native — G54 is compatibility mode only]] _(category+tag:5)_
- [[ctrl-122|Hurco WinMax BNC vs ISNC mode — critical differences]] _(category+op:1+tag:3)_

## Tags

#okuma #osp #tapping #g284 #g84 #g274 #rigid-tapping #no-m29 #post-processor #operation-tapping #machine-okuma #controller-fanuc
