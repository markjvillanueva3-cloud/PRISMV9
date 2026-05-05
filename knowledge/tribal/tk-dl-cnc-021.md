---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cnc-021
title: Mill CAM engraving trick: generate lathe profiles using mill CAM software
category: programming
subcategory: cam_strategy
domain: document_learned
knowledge_type: workaround
confidence: 82
source: document:cnccookbook-mill-cam-lathe@trick
created_at: 2026-03-06
usage_count: 0
tags: ["lathe", "mill-cam", "engraving", "g71", "profile", "workaround", "operation:profiling", "operation:roughing", "operation:turning", "operation:milling", "operation:engraving"]
material_groups: []
operation_types: ["profiling", "roughing", "turning", "milling", "engraving"]
content_hash: 3b92c78ec3734d47e7e4fd2329ea90c271dc2bde2e4c4b8083a7d46a4891aebd
mirror_ts: 2026-05-05T13:36:03.782Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mill CAM engraving trick: generate lathe profiles using mill CAM software

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `document_learned`

**Confidence:** `82` · **Source:** `document:cnccookbook-mill-cam-lathe@trick`

## Tip

If you have mill CAM but no lathe CAM, use the engraving/profiling toolpath to generate turning profiles. Draw the desired turned profile in CAD (XZ cross-section), import to mill CAM, and run an engraving toolpath along the contour. The output G-code contains the XZ coordinates of your profile. Strip the mill-specific codes (G17, spindle, etc.) and wrap the coordinates with G71 (rough turning cycle) header. The G71 cycle handles roughing passes automatically from the profile. This avoids manual coordinate calculation for complex turned profiles with arcs and tapers.

## Applies to

- Operation types: `profiling`, `roughing`, `turning`, `milling`, `engraving`

## Related tips

- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:4+tag:5)_
- [[ctrl-226|JM Die Okuma G85/G87 canned roughing and finishing — pattern turning cycles]] _(category+op:3+tag:4)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:3+tag:4)_
- [[tk-dl-g71-001|G71 rough turning: Type I vs Type II, U-word overloading trap, direction conventions]] _(category+op:3+tag:3)_
- [[ctrl-138|Hurco WinMax Profile milling with Max Offset]] _(category+op:3+tag:3)_

## Tags

#lathe #mill-cam #engraving #g71 #profile #workaround #operation-profiling #operation-roughing #operation-turning #operation-milling #operation-engraving
