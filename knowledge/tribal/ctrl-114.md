---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-114
title: Star swiss lathe Fanuc variant with NC Assist and B-axis
category: programming
subcategory: cam_strategy
domain: cam_software
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "star", "swiss-lathe", "fanuc-variant", "NC-Assist", "B-axis", "operation:profiling", "operation:turning", "operation:5_axis", "machine:Star", "tool:indexable_insert", "controller:fanuc"]
material_groups: []
operation_types: ["profiling", "turning", "5_axis"]
content_hash: 9f903550b9d8c75f8414401090a98e20e4da8835707c1928fc5a56ccc2c64360
mirror_ts: 2026-05-05T13:36:03.998Z
mirror_engine: TribalVaultPopulatorEngine
---

# Star swiss lathe Fanuc variant with NC Assist and B-axis

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `cam_software`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Star swiss lathes use Fanuc controllers (typically 31i-B or 18i-TB on older models) with Star-specific customizations. NC Assist is Star's template-driven CNC program editor that generates code from clickable machining templates with minimal input — faster than manual G-code for standard swiss operations. The Fanuc iHMI interface on newer models (15" touchscreen) includes conversational programming, free-figure contour programming, and fixed-phrase insert for building programs block-by-block. Some Star models feature double B-axis programmable units for simultaneous 5-axis control — unusual for swiss lathes. Star Motion Control System coordinates all axes for seamless operations. M-codes above M79 are Star-specific and vary by model — always verify against the machine's M-code table. Use CAM software (GibbsCAM, PartMaker) with Star-specific post processors for complex multi-axis programs.

## Applies to

- Operation types: `profiling`, `turning`, `5_axis`

## Related tips

- [[ctrl-116|Tsugami opposed gang tool swiss lathe with Fanuc 32i-B]] _(category+op:2+tag:6)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:3+tag:3)_
- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:2+tag:4)_
- [[ctrl-001|Fanuc AI Contour Control for 5-axis surface finish]] _(category+op:2+tag:3)_
- [[ctrl-007|Fanuc 0i-MF vs 31i-B5: key capability differences]] _(category+op:2+tag:3)_

## Tags

#controller #star #swiss-lathe #fanuc-variant #nc-assist #b-axis #operation-profiling #operation-turning #operation-5_axis #machine-star #tool-indexable_insert #controller-fanuc
