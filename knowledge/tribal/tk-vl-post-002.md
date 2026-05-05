---
schema_version: 1.0.0
kind: tribal_tip
id: TK-VL-post-002
title: Post-processor testing: always use a simple test part before production
category: safety
subcategory: coolant_safety
domain: video_learned
knowledge_type: anti_pattern
confidence: 88
source: video:vXe0s5IbpC4@120s
created_at: 2026-03-06
usage_count: 0
tags: ["post-processor", "testing", "verification", "single-block", "CAMWorks", "UPG", "operation:face_milling", "operation:pocketing", "operation:profiling", "operation:drilling", "operation:tapping", "operation:boring"]
material_groups: []
operation_types: ["face_milling", "pocketing", "profiling", "drilling", "tapping", "boring"]
content_hash: 1abfc6c1f534eadc3d63cd8675bfef20c8fedcd4b37adcf1c02c80209d7f599d
mirror_ts: 2026-05-05T13:36:02.163Z
mirror_engine: TribalVaultPopulatorEngine
---

# Post-processor testing: always use a simple test part before production

**Category:** `safety` · **Subcategory:** `coolant_safety` · **Domain:** `video_learned`

**Confidence:** `88` · **Source:** `video:vXe0s5IbpC4@120s`

## Tip

Before deploying any post processor change to production: (1) Create a dedicated test part with ALL operation types your shop uses (facing, pocketing, drilling, tapping, boring, contouring), (2) Post the test part and diff against the previous version, (3) Run in single-block mode on the actual controller, (4) Verify safe start block, tool change sequence, coolant codes, and program end. Never skip step 3 — a post that looks correct in text can still crash a machine due to modal state assumptions. For CAMWorks UPG posts, compile with EC Editor after every change — syntax errors in the post definition file (.pst) won't appear until runtime otherwise.

## Applies to

- Operation types: `face_milling`, `pocketing`, `profiling`, `drilling`, `tapping`, `boring`

## Related tips

- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(op:6+tag:6)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(op:4+tag:4)_
- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(op:4+tag:4)_
- [[tk-dl-hm-029|VT collision check only works for hole machining, not milling]] _(category+op:2+tag:2)_
- [[tk-dl-post-006|Canned cycle expansion: expand to linear moves when controller lacks the cycle]] _(op:3+tag:4)_

## Tags

#post-processor #testing #verification #single-block #camworks #upg #operation-face_milling #operation-pocketing #operation-profiling #operation-drilling #operation-tapping #operation-boring
