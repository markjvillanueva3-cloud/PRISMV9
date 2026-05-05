---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-157
title: Fanuc G54.4 workpiece error compensation — 30i/31i only
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: tip
confidence: 89
source: controller:fanuc_cps_rev44207
created_at: 2026-04-15
usage_count: 0
tags: ["fanuc", "g54.4", "workpiece-compensation", "30i", "31i", "probing", "error-comp", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: b086e4cd961a9131ced33a870eb665aa349cd03eca9cf14288a9f462d234c90e
mirror_ts: 2026-05-05T13:36:01.819Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc G54.4 workpiece error compensation — 30i/31i only

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `89` · **Source:** `controller:fanuc_cps_rev44207`

## Tip

G54.4 provides workpiece setting error compensation on Fanuc 30i/31i (not available on 0i). It compensates for workpiece tilt/offset measured by a probe during setup. Syntax: G54.4 P1 through P8 selects one of 8 error compensation data sets. G54.4 P0 cancels. The Fusion post exposes this via the useG54x4 property — when enabled, probing results are stored in G54.4 data sets rather than G68 rotation. The probe angle variables are: X-offset=#135, Y-offset=#136, angle R=#144, baseParam=26000. Key limitation: cannot use G68 coordinate rotation while G54.4 is active (and vice versa). G54.4 compensation is applied additionally on top of the active WCS (G54–G59) — it does not replace it.

## Related tips

- [[ctrl-004|Fanuc Macro B custom probing cycles]] _(category+tag:3)_
- [[ctrl-155|Fanuc Macro B skip function G31 — probing and in-process gauging]] _(category+tag:3)_
- [[ctrl-053|Fanuc probing with G31 skip signal]] _(category+tag:3)_
- [[ctrl-054|Fanuc G37 automatic tool length measurement]] _(category+tag:3)_
- [[ctrl-056|Fanuc G10 programmatic offset setting for automation]] _(category+tag:3)_

## Tags

#fanuc #g54-4 #workpiece-compensation #30i #31i #probing #error-comp #controller-fanuc
