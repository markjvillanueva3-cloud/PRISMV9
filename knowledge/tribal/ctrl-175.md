---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-175
title: Mazatrol system variables — #501 sub-spindle position and P901/P902 home parameters
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: tip
confidence: 90
source: controller:mazak_integrex_i200_cps_rev44199
created_at: 2026-04-14
usage_count: 0
tags: ["mazak", "mazatrol", "integrex", "variables", "#501", "system-variables", "sub-spindle", "parametric", "p901", "macro", "machine:Mazak", "controller:fanuc", "controller:mazak"]
material_groups: []
operation_types: []
content_hash: 73020749d7e73faf2220f4a379b478e169dadaae52e3c22cc2cacadc13965ff4
mirror_ts: 2026-05-05T13:36:01.534Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mazatrol system variables — #501 sub-spindle position and P901/P902 home parameters

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `90` · **Source:** `controller:mazak_integrex_i200_cps_rev44199`

## Tip

Mazatrol EIA programs use system variables in the #500 range. Key variables: #501 = sub-spindle (W-axis) current position — the Fusion Integrex post uses this for relative sub-spindle Z moves written as W[#501+offset] (e.g., W[#501+100.0] moves sub-spindle 100mm toward main). Machine home positions are stored in parameters: P901 = main Z home (zHomeParameter in post); P902 = sub Z home (zSubHomeParameter). Use G53 Z[#P901] to send main spindle to parameter-referenced home rather than hardcoded Z0. For parametric feed (useParametricFeed=true): Integrex post uses firstFeedParameter=105 so Q105 is the feed variable; QTU uses firstFeedParameter=100 so Q100. Mazatrol macro variables V1-V499 are program-local (cleared when program ends); V500-V999 persist through power cycles and are used for counters and accumulated tool life data. For EIA programs, Fanuc-style # variables are used rather than Mazatrol V variables.

## Related tips

- [[ctrl-169|Mazatrol EIA vs Mazatrol conversational — when to use each and how they differ]] _(category+tag:5)_
- [[ctrl-026|Mazak MAZATROL Smooth conversational vs EIA/ISO]] _(category+tag:5)_
- [[ctrl-172|Mazak Integrex vs QTU spindle M-code numbering — 200 and 300 series explained]] _(category+tag:4)_
- [[ctrl-173|Mazak spindle synchronization M511/M513 and stock transfer sequence]] _(category+tag:4)_
- [[ctrl-177|Mazak G61.1 geometry compensation for polar interpolation milling accuracy]] _(category+tag:4)_

## Tags

#mazak #mazatrol #integrex #variables #501 #system-variables #sub-spindle #parametric #p901 #macro #machine-mazak #controller-fanuc #controller-mazak
