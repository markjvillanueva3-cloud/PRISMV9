---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-155
title: Fanuc Macro B skip function G31 — probing and in-process gauging
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: tip
confidence: 92
source: controller:fanuc_cps_rev44207
created_at: 2026-04-15
usage_count: 0
tags: ["fanuc", "g31", "skip-function", "probing", "macro-b", "in-process", "gauging", "#5061", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: c16cb6b69431be42d12602fc469c04735fcc5ffe8800726a16ca7c9ad27bd277
mirror_ts: 2026-05-05T13:36:01.095Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc Macro B skip function G31 — probing and in-process gauging

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `92` · **Source:** `controller:fanuc_cps_rev44207`

## Tip

G31 (skip function) feeds at the programmed F rate until a skip signal arrives (probe contact), then executes a skip. The control stores the position at skip in system variables: #5061=X, #5062=Y, #5063=Z at skip point. Syntax: G31 F100 Z-50. (feed toward -Z at F100 until contact). After G31, the tool is at the contact position — store it: #101=#5063 (save Z touch). For probing sequences, use G31 with #5061–#5063, then compute deviations with Macro B arithmetic. Multiple skip levels: G31 P1–P4 on some controls. The Fusion post calls macro subprogram O9810 (protected retract), O9832 (probe on), O9833 (probe off) — these are Renishaw-style macros. Custom shops can write their own O9810 equivalent using G31.

## Related tips

- [[ctrl-004|Fanuc Macro B custom probing cycles]] _(category+tag:5)_
- [[ctrl-065|Fanuc Macro B tool breakage detection pattern]] _(category+tag:4)_
- [[ctrl-156|Fanuc Macro B variable classes — local, common, system]] _(category+tag:3)_
- [[ctrl-157|Fanuc G54.4 workpiece error compensation — 30i/31i only]] _(category+tag:3)_
- [[ctrl-052|Fanuc Macro B variable ranges and persistence]] _(category+tag:3)_

## Tags

#fanuc #g31 #skip-function #probing #macro-b #in-process #gauging #5061 #controller-fanuc
