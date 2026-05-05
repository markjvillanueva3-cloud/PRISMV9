---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-186
title: Okuma G605 Dynamic Fixture Offset — native 3+2 tilted work plane for OSP-P300/P500
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: rule
confidence: 92
source: controller:okuma_osp_p300_r01w_release_notes
created_at: 2026-04-15
usage_count: 0
tags: ["okuma", "osp", "g605", "g604", "g11", "dynamic-fixture-offset", "3+2", "tilted-workplane", "p300", "p500", "firmware", "machine:Okuma", "controller:okuma"]
material_groups: []
operation_types: []
content_hash: c3b7b03d6c9580395ed8c129c7b0487155988e07bc5e45e9e6b0a35ab099bbaa
mirror_ts: 2026-05-05T13:36:01.096Z
mirror_engine: TribalVaultPopulatorEngine
---

# Okuma G605 Dynamic Fixture Offset — native 3+2 tilted work plane for OSP-P300/P500

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `92` · **Source:** `controller:okuma_osp_p300_r01w_release_notes`

## Tip

G605 is Okuma's G-code-based tilted work plane command on OSP-P300 (R01w+) and P500. It replaces CALL OO88 with direct G-code syntax and integrates with the OSP kinematic model for better accuracy. Full sequence: (1) G604 [P[1-8]] — set rotary axis offset reference, (2) G605 H[n] — activate tilted WCS via fixture offset H[n], (3) Machine in tilted frame, (4) G11 — cancel tilt/rotation. The G11 cancel corresponds to gRotationModal in the post (formats as G604 or G11 depending on firmware). Autodesk Fusion post: 'Tilted work plane method' = 'G605', 'Rotary offset WCS' = 1–8 (0 = disable Roffset). G605 advantage vs CALL OO88: directly uses the control's kinematic transformation — eliminates the small angular errors introduced by the OO88 macro approximation. Required firmware: OSP-P300 R01w or later. On older P200 or pre-R01w P300: use CALL OO88 only.

## Related tips

- [[ctrl-185|Okuma CALL OO88 — macro-based fixture offset for 3+2 tilted work plane machining]] _(category+tag:7)_
- [[ctrl-182|Okuma Super-NURBS G08 D/I/L parameters — real-time spline fitting of G01 segments]] _(category+tag:5)_
- [[ctrl-180|Okuma OSP work offset format: G15 H## is native — G54 is compatibility mode only]] _(category+tag:4)_
- [[ctrl-031|Okuma OSP Super-NURBS for smooth 5-axis]] _(category+tag:4)_
- [[ctrl-225|JM Die Okuma lathe program structure — NAT subroutines with bar feeder loop]] _(category+tag:3)_

## Tags

#okuma #osp #g605 #g604 #g11 #dynamic-fixture-offset #3-2 #tilted-workplane #p300 #p500 #firmware #machine-okuma #controller-okuma
