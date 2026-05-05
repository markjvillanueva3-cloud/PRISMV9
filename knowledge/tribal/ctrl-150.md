---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-150
title: Fanuc G05.1 Q3 Nano Smoothing — NURBS conversion internally
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: tip
confidence: 93
source: controller:fanuc_cps_rev44207
created_at: 2026-04-15
usage_count: 0
tags: ["fanuc", "nano-smoothing", "g05.1", "nurbs", "31i-b5", "surface-finish", "5-axis", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: ce581f8784e14b013ab9ae3c6772b3f0a5cf258c263b598f274c77d4e8e0e89a
mirror_ts: 2026-05-05T13:36:00.970Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc G05.1 Q3 Nano Smoothing — NURBS conversion internally

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `93` · **Source:** `controller:fanuc_cps_rev44207`

## Tip

G05.1 Q3 activates Nano Smoothing on 31i-B5/30i-B. Unlike AICC (Q1) which adjusts acceleration profiles, Q3 mathematically converts short G01 line segments into smooth NURBS curves internally before motion execution. This eliminates micro-segment artifacts from dense CAM output without requiring the CAM system to output NURBS. The Fusion post uses: writeBlock(gFormat.format(5.1), 'Q3') when nano smoothing is enabled. Cancel with G05.1 Q0. On 0i-MF, G05.1 Q3 is not available — use G05.1 Q1 with the highest R level instead. On 31i-B5, both Q1 and Q3 can be active simultaneously for maximum surface quality.

## Related tips

- [[ctrl-001|Fanuc AI Contour Control for 5-axis surface finish]] _(category+tag:6)_
- [[ctrl-007|Fanuc 0i-MF vs 31i-B5: key capability differences]] _(category+tag:4)_
- [[ctrl-002|Fanuc Nano Smoothing vs AI Contour Control]] _(category+tag:4)_
- [[ctrl-151|Fanuc G68.2 tilted work plane — syntax and G53.1 confirmation]] _(category+tag:3)_
- [[ctrl-149|Fanuc AICC smoothing levels — G05.1 Q1 R[1-10] from .cps]] _(category+tag:3)_

## Tags

#fanuc #nano-smoothing #g05-1 #nurbs #31i-b5 #surface-finish #5-axis #controller-fanuc
