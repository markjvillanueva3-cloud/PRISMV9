---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-190
title: Haas NGC Setting 130 — tapping feed mode and G95 IPR best practice
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: rule
confidence: 97
source: controller:haas_ngc_settings_guide
created_at: 2026-04-15
usage_count: 0
tags: ["haas", "ngc", "setting-130", "tapping", "g84", "g95", "ipr", "feedrate", "rigid-tapping", "thread", "operation:tapping", "machine:Haas", "controller:haas"]
material_groups: []
operation_types: ["tapping"]
content_hash: 346ed3444c85706732d29b9c31ba7806a973efcc6867b002b8d26c29af0da62d
mirror_ts: 2026-05-05T13:36:00.805Z
mirror_engine: TribalVaultPopulatorEngine
---

# Haas NGC Setting 130 — tapping feed mode and G95 IPR best practice

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `97` · **Source:** `controller:haas_ngc_settings_guide`

## Tip

Setting 130 (Tapping Feed Mode) is a critical Haas NGC setting that determines how the F-word in G84/G74 tapping cycles is interpreted. Setting 130=0 (default on newer NGC): feed is in inches-per-revolution (IPR) or mm-per-revolution (MPR) — feedrate = pitch value directly (e.g., F0.0787 for 1/4-20, which is 1/20 = 0.05 inch pitch). Setting 130=1 (older Haas default): feed is in IPM/MPM — feedrate = RPM x pitch (e.g., S1500 F1500x0.05 = F75). The IPR mode (Setting 130=0 with G95) is far more reliable because the control synchronizes feed to spindle rotation rather than a calculated rate, tolerating minor RPM variation. Post processors should check Setting 130 and output accordingly. Fusion post property useG95forTapping=true outputs G95 before the tapping cycle and G94 after. When using a 3rd party post that does not handle Setting 130, verify manually: wrong mode causes stripped threads or broken taps. Always confirm Setting 130 after a machine update or parameter restore.

## Applies to

- Operation types: `tapping`

## Related tips

- [[ctrl-195|Haas G84.2 peck rigid tapping — software version requirement and deep tap strategy]] _(category+op:1+tag:5)_
- [[ctrl-181|Okuma G284 — OSP-native rigid tapping cycle, no M29 synchronization required]] _(category+op:1+tag:4)_
- [[ctrl-010|Fanuc rigid tapping G84 with synchronization]] _(category+op:1+tag:3)_
- [[ctrl-208|Mitsubishi rigid tapping ,R1 syntax and program number reservation ranges]] _(category+op:1+tag:3)_
- [[ctrl-189|Haas G187 P-level and E-tolerance — complete smoothing guide]] _(category+tag:4)_

## Tags

#haas #ngc #setting-130 #tapping #g84 #g95 #ipr #feedrate #rigid-tapping #thread #operation-tapping #machine-haas #controller-haas
