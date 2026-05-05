---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-057
title: Fanuc coolant M-codes including through-spindle
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: anti_pattern
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "fanuc", "coolant", "through-spindle", "M-codes", "operation:hsm", "controller:fanuc"]
material_groups: []
operation_types: ["hsm"]
content_hash: dcb5576def7ab27f43a55c56d1b929f9b1d0c1ad830e63f7e0bca77447ee9a4b
mirror_ts: 2026-05-05T13:36:03.935Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc coolant M-codes including through-spindle

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Standard coolant: M7 (mist coolant on), M8 (flood coolant on), M9 (all coolant off). Combined spindle+coolant: M13 (spindle CW + coolant on), M14 (spindle CCW + coolant on) — saves a line vs separate M3/M8. Through-spindle coolant (TSC): M-codes are builder-specific, commonly M50, M51, or in the M80-M89 range. Always check your machine manual. High-pressure coolant systems may have separate M-codes for pressure selection. Some builders use M-codes in the M600 series for coolant pressure levels. For TSC: ensure spindle is at speed before activating TSC to avoid coolant spray without rotation. When programming TSC with HSM, place the TSC activation M-code before the cutting move, not in the same block as rapid positioning.

## Applies to

- Operation types: `hsm`

## Related tips

- [[ctrl-051|Fanuc look-ahead buffer sizes by controller model]] _(category+op:1+tag:4)_
- [[ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]] _(category+op:1+tag:4)_
- [[ctrl-063|Fanuc G08 Advanced Preview Control for high-speed machining]] _(category+op:1+tag:4)_
- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+op:1+tag:4)_
- [[ctrl-005|Fanuc high-speed peck drilling G73 vs G83]] _(category+op:1+tag:3)_

## Tags

#controller #fanuc #coolant #through-spindle #m-codes #operation-hsm #controller-fanuc
