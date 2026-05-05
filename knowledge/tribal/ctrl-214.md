---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-214
title: Hurco WinMax G68.2 stacking — multiple transform planes require separate G69 cancels
category: programming
domain: controller_specific
knowledge_type: tip
confidence: 93
source: controller:cope_hurco_5axis_post_notes_2012
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "g68.2", "g69", "stacking", "transform-plane", "lifo", "multiple-planes", "5-axis", "machine:Hurco"]
material_groups: []
operation_types: []
content_hash: 924b040b659745c54752315626fdc0ac53106afc15dc248e0297ed4f0c09a69e
mirror_ts: 2026-05-05T13:36:00.980Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax G68.2 stacking — multiple transform planes require separate G69 cancels

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `93` · **Source:** `controller:cope_hurco_5axis_post_notes_2012`

## Tip

Transform planes (G68.2) can be stacked on WinMax — each additional G68.2 is relative to the previous workplane. However, each stacked plane requires a separate G69 to cancel. Cancellation is LIFO (last-in-first-out): the last G68.2 called is cancelled first. Example: G68.2 A-90, G68.2 B30 creates a compound tilt. G69 cancels the B30 plane, another G69 cancels the A-90 plane. If you call only one G69 after two stacked planes, the first plane remains active causing positioning errors. Best practice: count G68.2 calls and ensure equal G69 cancels.

## Related tips

- [[ctrl-213|Hurco WinMax G68.2 — transform plane enables TCPM and does NOT command movement]] _(category+tag:7)_
- [[ctrl-142|Hurco G68.2 Transform Plane for 3+2 positioning]] _(category+tag:6)_
- [[ctrl-210|Hurco WinMax 5-axis safety line — NO G17/G18/G19 plane designation]] _(category+tag:6)_
- [[ctrl-220|Hurco WinMax rotary axis settings — ISO Standard YES, Tilt Axis Preference NEGATIVE]] _(category+tag:5)_
- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+tag:4)_

## Tags

#hurco #winmax #g68-2 #g69 #stacking #transform-plane #lifo #multiple-planes #5-axis #machine-hurco
