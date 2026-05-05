---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-167
title: Siemens 840D SUPA — super retract that overrides all active coordinate frames
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: rule
confidence: 93
source: controller:siemens_840d_cps_rev44207
created_at: 2026-04-15
usage_count: 0
tags: ["siemens", "840d", "supa", "retract", "frame-override", "cycle800", "zhome", "safe-retract", "coordinate-frames", "controller:siemens"]
material_groups: []
operation_types: []
content_hash: 1f62570c4f3d924a2f42a71133da775f6de5888a365fcd58fef553525b9172d5
mirror_ts: 2026-05-05T13:36:00.978Z
mirror_engine: TribalVaultPopulatorEngine
---

# Siemens 840D SUPA — super retract that overrides all active coordinate frames

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `93` · **Source:** `controller:siemens_840d_cps_rev44207`

## Tip

SUPA is the Siemens 840D super-positioning G-code: it overrides ALL active frames including G53 (machine coordinates), work offsets, CYCLE800 tilted planes, TRANS/ROT shifts, and tool length compensation D. This makes SUPA the safest retract for programs that use complex frame stacking. The Fusion 840D post offers SUPA as one of four retract method options (property safePositionMethod). When SUPA is selected the post outputs SUPA G0 Z<home> using _ZHOME, _XHOME, _YHOME variables defined by the machine builder. SUPA is especially important after CYCLE800 — if CYCLE800 is not cancelled and you retract with G53 alone, the G53 move is interpreted in the last active (tilted) plane. SUPA bypasses all frames unconditionally. Downside: SUPA moves are always in machine coordinates, so the programmer must ensure the machine Z home is above all fixtures before using _ZHOME.

## Related tips

- [[ctrl-160|Siemens 840D TRAFOOF — safely cancelling 5-axis TCP transformation]] _(category+tag:4)_
- [[ctrl-161|Siemens 840D CYCLE800 swivel data record — setup and common pitfalls]] _(category+tag:4)_
- [[ctrl-162|Siemens 840D CYCLE832 smoothing levels and 6-digit technology code]] _(category+tag:3)_
- [[ctrl-159|Siemens 840D TRAORI — enabling 5-axis simultaneous TCP and tool vector output]] _(category+tag:3)_
- [[ctrl-166|Siemens 840D extended work offsets G505-G599 and TRANS/ATRANS frame programming]] _(category+tag:3)_

## Tags

#siemens #840d #supa #retract #frame-override #cycle800 #zhome #safe-retract #coordinate-frames #controller-siemens
