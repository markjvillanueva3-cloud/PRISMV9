---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-119
title: EMAG inverted vertical lathe programming with Siemens 840D
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "emag", "siemens-variant", "inverted-spindle", "vertical-lathe", "pick-up", "operation:turning", "operation:grinding", "controller:fanuc", "controller:siemens"]
material_groups: []
operation_types: ["turning", "grinding"]
content_hash: edb08dfcec30c3dc8bbeaf8493605fe4c0521582581fd2864e670dc7910246a2
mirror_ts: 2026-05-05T13:36:04.003Z
mirror_engine: TribalVaultPopulatorEngine
---

# EMAG inverted vertical lathe programming with Siemens 840D

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

EMAG vertical lathes (VL/VT series) use an inverted spindle design where the spindle picks up the workpiece from below, acting as both loader and machining spindle. This fundamentally changes programming: every program must include an auto-loading sequence using the workholding chuck — the spindle descends to a spring-loaded pick-up station, grabs the blank (gimbaled plate compensates for misalignment), then retracts to the machining position. Tool turrets and ways are positioned above, outside the chip/coolant zone. EMAG uses Siemens 840D sl on turning/grinding models and Fanuc on some VT models. When upgrading from older Schubert CC15 controls to Siemens, EMAG transfers all programs and parameters without data loss. For the VT 2/VT 4 shaft machines, 4-axis programming enables precision shaft machining. Z-axis direction is inverted compared to horizontal lathes — verify your coordinate system orientation.

## Applies to

- Operation types: `turning`, `grinding`

## Related tips

- [[ctrl-120|EMAG modular machine line and Siemens cycle integration]] _(category+op:1+tag:5)_
- [[ctrl-115|Index C200 dual-controller option and INDEXoperate interface]] _(category+op:1+tag:4)_
- [[ctrl-206|Mitsubishi turning G-code list types 2-7: feed mode and spindle speed limit differences]] _(category+op:1+tag:3)_
- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:1+tag:3)_
- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+op:1+tag:3)_

## Tags

#controller #emag #siemens-variant #inverted-spindle #vertical-lathe #pick-up #operation-turning #operation-grinding #controller-fanuc #controller-siemens
