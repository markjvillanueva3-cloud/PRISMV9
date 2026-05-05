---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-158
title: Fanuc through-tool coolant M88/M89 and combined flood+through
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: rule
confidence: 88
source: controller:fanuc_cps_rev44207
created_at: 2026-04-15
usage_count: 0
tags: ["fanuc", "m88", "m89", "through-tool-coolant", "m08", "coolant", "tapping", "spindle", "operation:tapping", "operation:threading", "tool:tap", "controller:fanuc"]
material_groups: []
operation_types: ["tapping", "threading"]
content_hash: 67b662ddc0c993ac32d55ebab2ef1db783dde2fea1427147f36af64a548245b4
mirror_ts: 2026-05-05T13:36:02.228Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc through-tool coolant M88/M89 and combined flood+through

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `88` · **Source:** `controller:fanuc_cps_rev44207`

## Tip

Fanuc through-tool (spindle center) coolant uses M88 (on) and M89 (off). For combined flood + through-tool coolant, the Fusion post outputs both M08 and M88 in sequence. The post settings define: COOLANT_FLOOD → M08 (off implicit via M09), COOLANT_THROUGH_TOOL → M88 on / M89 off, COOLANT_FLOOD_THROUGH_TOOL → M08+M88 on / M09+M89 off. The singleLineCoolant setting (false by default) outputs each M-code on its own block. For thread tapping, coolant should be M88 (through-tool) for the best tap life — this requires a through-coolant spindle option on the machine. Note: M09 cancels ALL coolant including through-tool; use M89 to cancel only through-tool while keeping flood M08 active. Always confirm machine has through-coolant spindle before programming M88.

## Applies to

- Operation types: `tapping`, `threading`

## Related tips

- [[ctrl-208|Mitsubishi rigid tapping ,R1 syntax and program number reservation ranges]] _(category+op:2+tag:4)_
- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+op:2+tag:4)_
- [[ctrl-123|Hurco WinMax G84.2/G84.3 dual Z-word peck tapping]] _(category+op:2+tag:2)_
- [[ctrl-199|Brother G77/G78 pitch-based tapping — 30+ taps per minute]] _(category+op:1+tag:4)_
- [[ctrl-010|Fanuc rigid tapping G84 with synchronization]] _(category+op:1+tag:4)_

## Tags

#fanuc #m88 #m89 #through-tool-coolant #m08 #coolant #tapping #spindle #operation-tapping #operation-threading #tool-tap #controller-fanuc
