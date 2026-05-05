---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-052
title: Fanuc Macro B variable ranges and persistence
category: programming
subcategory: macro
domain: controller_specific
knowledge_type: tip
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "fanuc", "macro-b", "programming", "variables", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: 78622485ada063957d74546859cd4f8e531b77d4bb8cba8e4b85581405c5b725
mirror_ts: 2026-05-05T13:36:03.930Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc Macro B variable ranges and persistence

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Fanuc Macro B variable ranges: Local variables #1-#33 (per-call scope, cleared on power-off, used for G65/G66 argument passing). Common variables #100-#199 (global, cleared on power-off — use for temporary cross-macro data). Common variables #500-#999 (global, RETAINED on power-off — use for persistent data like tool counts, calibration offsets, fixture data). System variables #1000+ (read/write machine state). Argument mapping for G65 calls: A=#1, B=#2, C=#3, D=#7, E=#8, F=#9, H=#11, I=#4, J=#5, K=#6, M=#13, Q=#17, R=#18, S=#19, T=#20, U=#21, V=#22, W=#23, X=#24, Y=#25, Z=#26. Note the non-sequential mapping — a common source of bugs.

## Related tips

- [[ctrl-156|Fanuc Macro B variable classes — local, common, system]] _(category+tag:5)_
- [[ctrl-059|Fanuc system variables for alarms and program control]] _(category+tag:5)_
- [[ctrl-004|Fanuc Macro B custom probing cycles]] _(category+tag:4)_
- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+tag:4)_
- [[ctrl-065|Fanuc Macro B tool breakage detection pattern]] _(category+tag:4)_

## Tags

#controller #fanuc #macro-b #programming #variables #controller-fanuc
