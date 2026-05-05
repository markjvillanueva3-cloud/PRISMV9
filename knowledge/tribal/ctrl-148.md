---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-148
title: Hurco BNC vs ISNC mode detection on machine
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: rule
confidence: 92
source: controller:hurco_bnc_isnc_guide
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "bnc", "isnc", "detection", "mode-check", "setup", "operation:tapping", "machine:Hurco", "controller:fanuc"]
material_groups: []
operation_types: ["tapping"]
content_hash: 54000ac8471cbf4c915107c9650ebc88bc0e0064ffccd1ef3f2c5c654ccd1018
mirror_ts: 2026-05-05T13:36:01.094Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco BNC vs ISNC mode detection on machine

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `92` · **Source:** `controller:hurco_bnc_isnc_guide`

## Tip

To check current NC mode on Hurco WinMax/UltiMax: (1) Press Auxiliary Menu button, (2) Select Utility icon (penknife), (3) User Preferences, (4) Entry Settings. Mode dropdown shows BNC or ISNC. Can be changed here. Post processor must match machine mode: BNC uses Hurco-native syntax (G88 tapping, relative Z in cycles), ISNC is Fanuc-compatible (G84+M29 tapping, absolute Z). Most CAM systems output ISNC for cross-machine compatibility. Always verify mode before running new posts.

## Applies to

- Operation types: `tapping`

## Related tips

- [[ctrl-122|Hurco WinMax BNC vs ISNC mode — critical differences]] _(category+op:1+tag:7)_
- [[ctrl-123|Hurco WinMax G84.2/G84.3 dual Z-word peck tapping]] _(category+op:1+tag:5)_
- [[ctrl-218|Hurco WinMax TVCC — tool vector canned cycles without transform plane]] _(category+op:1+tag:4)_
- [[ctrl-219|Hurco WinMax TVCC restrictions — G76, G87, G88 with I_J_ parameter not supported]] _(category+op:1+tag:4)_
- [[ctrl-181|Okuma G284 — OSP-native rigid tapping cycle, no M29 synchronization required]] _(category+op:1+tag:2)_

## Tags

#hurco #winmax #bnc #isnc #detection #mode-check #setup #operation-tapping #machine-hurco #controller-fanuc
