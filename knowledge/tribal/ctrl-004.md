---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-004
title: Fanuc Macro B custom probing cycles
category: programming
subcategory: macro
domain: controller_specific
knowledge_type: tip
confidence: 92
source: controller:fanuc_macro_manual
created_at: 2026-03-07
usage_count: 0
tags: ["fanuc", "macro-b", "probing", "g31", "custom-cycle", "variables", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: f10d89497f0c051ed01fd0a3e5069a3f4e83fab606af7132fd911ece6a89483e
mirror_ts: 2026-05-05T13:36:01.083Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc Macro B custom probing cycles

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `controller_specific`

**Confidence:** `92` · **Source:** `controller:fanuc_macro_manual`

## Tip

Fanuc Macro B (#variables and G65 subprogram calls) enables custom probing cycles far more flexible than canned cycles. Key variables: #5021-#5023 (current machine position XYZ), #100-#199 (common variables), #500-#999 (persistent across power cycles). Use G31 (skip function) with a probe signal to detect contact, then store positions. Pattern: G31 F100 Z-50. (feed until skip signal), then #101=#5023 (store Z touch position).

## Related tips

- [[ctrl-155|Fanuc Macro B skip function G31 — probing and in-process gauging]] _(category+tag:5)_
- [[ctrl-156|Fanuc Macro B variable classes — local, common, system]] _(category+tag:4)_
- [[ctrl-052|Fanuc Macro B variable ranges and persistence]] _(category+tag:4)_
- [[ctrl-065|Fanuc Macro B tool breakage detection pattern]] _(category+tag:4)_
- [[ctrl-023|Haas macro variables and probing]] _(category+tag:3)_

## Tags

#fanuc #macro-b #probing #g31 #custom-cycle #variables #controller-fanuc
