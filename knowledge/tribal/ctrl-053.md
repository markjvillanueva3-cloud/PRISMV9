---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-053
title: Fanuc probing with G31 skip signal
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: anti_pattern
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "fanuc", "probing", "G31", "skip-signal", "measurement", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: 55d3de667d412b0bfee19582c2314268bf4e3df87a3e5307a3aafd0d712ca433
mirror_ts: 2026-05-05T13:36:03.931Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc probing with G31 skip signal

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

G31 (skip function) moves axes at programmed feedrate until a skip signal (probe contact) is received, then stops motion and records the contact position in system variables #5061-#5068 (machine coordinates at skip). Usage: G31 Z-50. F100 (probe toward Z-50 at 100mm/min). After contact, read #5061 (X), #5062 (Y), #5063 (Z) for the exact trip point. Always use a protected move approach — never rapid (G00) with a probe loaded; use G31 to detect unexpected collisions. Renishaw and Blum probing packages build their cycles on G31. Multi-skip variants: G31.1/G31.2/G31.3 use different skip signal inputs (useful for multi-probe setups). Feed override is typically disabled during G31 for consistent results.

## Related tips

- [[ctrl-054|Fanuc G37 automatic tool length measurement]] _(category+tag:4)_
- [[ctrl-056|Fanuc G10 programmatic offset setting for automation]] _(category+tag:4)_
- [[ctrl-065|Fanuc Macro B tool breakage detection pattern]] _(category+tag:4)_
- [[ctrl-004|Fanuc Macro B custom probing cycles]] _(category+tag:3)_
- [[ctrl-050|Universal probing compatibility across controllers]] _(category+tag:3)_

## Tags

#controller #fanuc #probing #g31 #skip-signal #measurement #controller-fanuc
