---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-029
title: Okuma OSP unique G-code dialect
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: rule
confidence: 93
source: controller:okuma_osp_manual
created_at: 2026-03-07
usage_count: 0
tags: ["okuma", "osp", "g-code", "dialect", "non-fanuc", "programming", "machine:Okuma", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: b007209b1900120d9f4e80f9afe174bc1bec54bb95dedf3638387b73a3e90f29
mirror_ts: 2026-05-05T13:36:00.966Z
mirror_engine: TribalVaultPopulatorEngine
---

# Okuma OSP unique G-code dialect

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `93` · **Source:** `controller:okuma_osp_manual`

## Tip

Okuma OSP is NOT Fanuc-compatible — it uses a proprietary G-code dialect. Key differences: G15 H1 (machining coordinate system, vs Fanuc G54), CALL OO_ (subroutine call, vs Fanuc M98), GOTO N_ (branch, vs Fanuc conditional GO TO), no decimal point programming (G1 X10000 = 10.000mm). OSP also uses IF/THEN/ELSE and WHILE/DO loops natively — more readable than Fanuc Macro B. CAM post-processors MUST use Okuma-specific posts.

## Related tips

- [[ctrl-180|Okuma OSP work offset format: G15 H## is native — G54 is compatibility mode only]] _(category+tag:4)_
- [[ctrl-181|Okuma G284 — OSP-native rigid tapping cycle, no M29 synchronization required]] _(category+tag:4)_
- [[ctrl-179|Okuma OSP macro V-variables vs Fanuc #-variables — syntax translation guide]] _(category+tag:4)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+tag:4)_
- [[ctrl-031|Okuma OSP Super-NURBS for smooth 5-axis]] _(category+tag:4)_

## Tags

#okuma #osp #g-code #dialect #non-fanuc #programming #machine-okuma #controller-fanuc
