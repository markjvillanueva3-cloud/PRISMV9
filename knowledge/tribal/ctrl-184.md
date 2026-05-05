---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-184
title: Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop
category: programming
subcategory: macro
domain: controller_specific
knowledge_type: rule
confidence: 91
source: controller:okuma_navi_mill_operator_guide
created_at: 2026-04-15
usage_count: 0
tags: ["okuma", "osp", "navi-mill", "navi-lathe", "conversational", "iso", "g-code", "5-axis-limit", "jm-die", "lathe", "operation:face_milling", "operation:pocketing", "operation:profiling", "operation:finishing", "operation:drilling", "operation:threading", "operation:turning", "operation:milling", "operation:5_axis", "machine:Okuma", "tool:face_mill", "tool:drill"]
material_groups: []
operation_types: ["face_milling", "pocketing", "profiling", "finishing", "drilling", "threading", "turning", "milling", "5_axis"]
content_hash: b788acc8f884622622e04308d47bf957aea5b917adec9cf06cba6a37ffd29ae9
mirror_ts: 2026-05-05T13:36:01.221Z
mirror_engine: TribalVaultPopulatorEngine
---

# Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `controller_specific`

**Confidence:** `91` · **Source:** `controller:okuma_navi_mill_operator_guide`

## Tip

NAVI-Mill is OSP's conversational programming environment — operators define operations (face mill, pocket, drill, contour) graphically without writing G-code. Key rules: (1) NAVI programs are stored as parametric operation records, not G-code — cannot be transferred to non-Okuma machines without first exporting as .MIN G-code. (2) NAVI supports up to 4-axis; 5-axis simultaneous machining requires ISO G-code programming mode. (3) To inspect the generated G-code: EDIT → G-CODE VIEW. (4) NAVI programs can call G-code subprograms via CALL O#### for custom macros. (5) NAVI-Lathe (turning) covers OD/ID turning, threading, grooving, and drilling — the standard programming mode on JM Die's Okuma CNC lathes for die-blank turning. When troubleshooting NAVI surface finish or tool life issues, always examine the G-CODE VIEW to see actual feedrates and depths — NAVI may apply conservative defaults differing from what was programmed.

## Applies to

- Operation types: `face_milling`, `pocketing`, `profiling`, `finishing`, `drilling`, `threading`, `turning`, `milling`, `5_axis`

## Related tips

- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(category+op:7+tag:8)_
- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:7+tag:8)_
- [[ctrl-070|ShopMill/ShopTurn Conversational Programming]] _(category+op:6+tag:7)_
- [[ctrl-198|Haas G150 general pocket milling — mandatory pre-drill and subprogram boundary format]] _(category+op:4+tag:7)_
- [[ctrl-169|Mazatrol EIA vs Mazatrol conversational — when to use each and how they differ]] _(category+op:4+tag:7)_

## Tags

#okuma #osp #navi-mill #navi-lathe #conversational #iso #g-code #5-axis-limit #jm-die #lathe #operation-face_milling #operation-pocketing #operation-profiling #operation-finishing #operation-drilling #operation-threading #operation-turning #operation-milling #operation-5_axis #machine-okuma #tool-face_mill #tool-drill
