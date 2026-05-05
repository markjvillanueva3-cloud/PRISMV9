---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-177
title: Mazak G61.1 geometry compensation for polar interpolation milling accuracy
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: tip
confidence: 91
source: controller:mazak_integrex_i200_cps_rev44199
created_at: 2026-04-14
usage_count: 0
tags: ["mazak", "integrex", "qtu", "g61.1", "geometry-compensation", "polar-interpolation", "g12.1", "cutter-comp", "accuracy", "operation:milling", "machine:Mazak", "controller:fanuc"]
material_groups: []
operation_types: ["milling"]
content_hash: 72e85857192c852421de74ae8061d48da3f306faf756de3bb7a0426c7a192bc5
mirror_ts: 2026-05-05T13:36:01.220Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mazak G61.1 geometry compensation for polar interpolation milling accuracy

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `91` · **Source:** `controller:mazak_integrex_i200_cps_rev44199`

## Tip

G61.1 is Mazak's geometry compensation mode — applied in the rotary polar coordinate system during G12.1 polar interpolation. When G61.1 is active (useG61=true in Fusion post), the control compensates for the offset between the C-axis centerline and the tool tip during linear interpolation in polar mode. Without G61.1, small errors accumulate as C-axis rotates — particularly visible at the ends of flat faces where the toolpath transitions from cutting to air. Sequence: enable G61.1 before G12.1 activation; cancel with G40 after G13.1. G61.1 works with the active tool radius offset (D offset). Important distinction: G61.1 on Mazak is entirely different from G61 exact-stop mode on Fanuc — they share similar code numbers but completely different functions. On older Matrix controllers, geometry compensation may not be a purchased option — verify the machine option list before relying on G61.1. The Fusion post property useG61 (default true) controls whether G61.1 is output.

## Applies to

- Operation types: `milling`

## Related tips

- [[ctrl-170|Mazak Integrex G12.1 polar interpolation — complete activation and cancel sequence]] _(category+op:1+tag:7)_
- [[ctrl-172|Mazak Integrex vs QTU spindle M-code numbering — 200 and 300 series explained]] _(category+op:1+tag:5)_
- [[ctrl-173|Mazak spindle synchronization M511/M513 and stock transfer sequence]] _(category+op:1+tag:5)_
- [[ctrl-178|Mazak part catcher M-codes — M48/M49 on QTU vs M248/M249 on Integrex]] _(category+op:1+tag:5)_
- [[tk-dl-mazak-001|G12.1 polar coordinate interpolation for face milling on cylindrical parts]] _(category+op:1+tag:5)_

## Tags

#mazak #integrex #qtu #g61-1 #geometry-compensation #polar-interpolation #g12-1 #cutter-comp #accuracy #operation-milling #machine-mazak #controller-fanuc
