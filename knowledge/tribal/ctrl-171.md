---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-171
title: Mazak Integrex B-axis 3+2 milling — M107/M108 lock sequence and TCP setup
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: anti_pattern
confidence: 94
source: controller:mazak_integrex_i200_cps_rev44199
created_at: 2026-04-14
usage_count: 0
tags: ["mazak", "integrex", "b-axis", "3+2", "tilted-plane", "g68", "g68.2", "m107", "m108", "tcp", "g43", "rtcp", "operation:milling", "machine:Mazak"]
material_groups: []
operation_types: ["milling"]
content_hash: e2b65824b330ff82da3eb928d42cde78728675e138d0b7e77969d38a6fa679a2
mirror_ts: 2026-05-05T13:36:00.907Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mazak Integrex B-axis 3+2 milling — M107/M108 lock sequence and TCP setup

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `94` · **Source:** `controller:mazak_integrex_i200_cps_rev44199`

## Tip

The Mazak Integrex i-series has a B-axis (tilting milling spindle) enabling milling at angles. B-axis range is typically -30 to +210 degrees on the i-200. For 3+2 milling: (1) Position B-axis: G0 B[angle] — Fusion post outputs this before G68/G68.2 activation; (2) Lock B-axis: M107 — prevents B movement during milling; (3) Apply work plane transform: G68 (rotation vector, Fusion property tiltedPlaneMethod=G68) or G68.2 (Euler angles, preferred on Smooth controller); (4) Activate TCP: G43 H#3020 (useFixedOffset=true in Fusion post) for consistent tool length regardless of B angle; (5) Mill the feature; (6) Cancel tilted plane: G69; (7) Unlock B-axis: M108. The useFixedOffset=true property outputs G43 H#3020 instead of a fixed H offset number — this references the current tool offset register automatically and avoids hard-coded offset numbers that change between setups. B-axis maximum rapid speed is typically 10 RPM — never rapid B-axis while the milling spindle is running.

## Applies to

- Operation types: `milling`

## Related tips

- [[ctrl-170|Mazak Integrex G12.1 polar interpolation — complete activation and cancel sequence]] _(category+op:1+tag:4)_
- [[ctrl-172|Mazak Integrex vs QTU spindle M-code numbering — 200 and 300 series explained]] _(category+op:1+tag:4)_
- [[ctrl-173|Mazak spindle synchronization M511/M513 and stock transfer sequence]] _(category+op:1+tag:4)_
- [[ctrl-178|Mazak part catcher M-codes — M48/M49 on QTU vs M248/M249 on Integrex]] _(category+op:1+tag:4)_
- [[ctrl-177|Mazak G61.1 geometry compensation for polar interpolation milling accuracy]] _(category+op:1+tag:4)_

## Tags

#mazak #integrex #b-axis #3-2 #tilted-plane #g68 #g68-2 #m107 #m108 #tcp #g43 #rtcp #operation-milling #machine-mazak
