---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-212
title: Hurco WinMax G53 Z0 vs G91 G28 Z0 — machine coordinate retract
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: rule
confidence: 94
source: controller:cope_hurco_5axis_post_notes_2012
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "g53", "g28", "g91", "g90", "retract", "machine-coordinates", "5-axis", "operation:5_axis", "machine:Hurco"]
material_groups: []
operation_types: ["5_axis"]
content_hash: 9f59d3576cb4c7a722df0c71a86cf3bf4727ce16b5c944e2decd1892a102461f
mirror_ts: 2026-05-05T13:36:00.916Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax G53 Z0 vs G91 G28 Z0 — machine coordinate retract

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `94` · **Source:** `controller:cope_hurco_5axis_post_notes_2012`

## Tip

For Z-axis retract to home position, G53 Z0 (machine coordinate system) is recommended over G91 G28 Z0. If using G91 G28 Z0, the post MUST output G90 immediately after to return the control to absolute mode — failure to do this leaves the control in incremental mode causing subsequent positioning errors. G53 Z0 is cleaner: it goes directly to machine Z home without changing modes. For full 5-axis retract sequence after simultaneous machining: M129 (cancel TCPM), G0 M140 (retract along tool vector), G53 Z0 (machine Z home), G53 A0 C0 (rotary home).

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-211|Hurco WinMax M140 — retract along current tool vector to machine limits]] _(category+op:1+tag:6)_
- [[ctrl-126|Hurco WinMax M140 — safe 5-axis retract along tool vector]] _(category+op:1+tag:6)_
- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+op:1+tag:5)_
- [[ctrl-141|Hurco 5-axis program header essentials — M31, M126, M140]] _(category+op:1+tag:5)_
- [[ctrl-209|Hurco WinMax M31 — rotary axis encoder reset prevents unwinding]] _(category+op:1+tag:5)_

## Tags

#hurco #winmax #g53 #g28 #g91 #g90 #retract #machine-coordinates #5-axis #operation-5_axis #machine-hurco
