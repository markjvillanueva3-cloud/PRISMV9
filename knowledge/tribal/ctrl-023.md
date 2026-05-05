---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-023
title: Haas macro variables and probing
category: programming
subcategory: macro
domain: controller_specific
knowledge_type: tip
confidence: 90
source: controller:haas_macro_manual
created_at: 2026-03-07
usage_count: 0
tags: ["haas", "ngc", "macro", "probing", "wips", "variables", "machine:Haas", "controller:fanuc", "controller:haas"]
material_groups: []
operation_types: []
content_hash: 5a5604e8cc48fae9826807a23abbca4b1b29b2a5588db53d6be92d8891c1c699
mirror_ts: 2026-05-05T13:36:01.522Z
mirror_engine: TribalVaultPopulatorEngine
---

# Haas macro variables and probing

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `controller_specific`

**Confidence:** `90` · **Source:** `controller:haas_macro_manual`

## Tip

Haas NGC supports Fanuc-compatible Macro B with key additions: #5021-#5023 (machine position), #5041-#5043 (work position), #3027 (spindle load %), #1601-#1800 (tool offsets). Haas WIPS (Wireless Intuitive Probing System): use G65 P9995 calls for automated probing. Unlike Fanuc, Haas stores probe results in #10001-#10020. Setting 59 enables/disables macros.

## Related tips

- [[ctrl-196|Haas G154 P1-P99 extended work offsets — pallet and tombstone programming]] _(category+tag:5)_
- [[ctrl-024|Haas NGC unique M-codes reference]] _(category+tag:5)_
- [[ctrl-022|Haas NGC Setting 191 for smoothing tolerance]] _(category+tag:5)_
- [[ctrl-090|Haas macro look-ahead gotcha — G103 P1 for variable reads]] _(category+tag:5)_
- [[ctrl-190|Haas NGC Setting 130 — tapping feed mode and G95 IPR best practice]] _(category+tag:4)_

## Tags

#haas #ngc #macro #probing #wips #variables #machine-haas #controller-fanuc #controller-haas
