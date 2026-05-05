---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-111
title: DATRON next SimPL programming language vs G-code
category: programming
subcategory: cam_strategy
domain: cam_software
knowledge_type: anti_pattern
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "datron", "SimPL", "micro-milling", "high-speed", "post-processor", "operation:finishing", "operation:engraving", "controller:fanuc"]
material_groups: []
operation_types: ["finishing", "engraving"]
content_hash: b7d1c46e817bb7a0da850eb49001cdadd77c5044035c540194965a5279744e04
mirror_ts: 2026-05-05T13:36:03.995Z
mirror_engine: TribalVaultPopulatorEngine
---

# DATRON next SimPL programming language vs G-code

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `cam_software`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

DATRON machines use SimPL (Simple Programming Language) instead of standard G-code. SimPL is a modern conversational language with plain-language commands, syntax checking, auto-completion, and debugging — features absent from traditional G-code controls. DATRON worked with major CAM vendors (Fusion 360, Mastercam, SolidCAM, HSMWorks, CAMWorks) to create post-processors that output directly to SimPL format. Do NOT use generic Fanuc/ISO posts — they will not work. The next control adds interpolation points within CAM tolerance bands, calculated to 5 decimal places (metric) for superior surface finish on micro-milled parts. Z Surface Mapping with the measuring probe automatically compensates for workpiece surface variations — essential for engraving and thin-sheet machining. Auto Tool Management monitors wear and swaps sister tools without program changes.

## Applies to

- Operation types: `finishing`, `engraving`

## Related tips

- [[ctrl-041|DATRON next controller for micro-milling]] _(category+op:1+tag:4)_
- [[ctrl-149|Fanuc AICC smoothing levels — G05.1 Q1 R[1-10] from .cps]] _(category+op:1+tag:3)_
- [[tk-dl-post-001|Smoothing/HSM control codes differ by controller — always output for 3D finishing]] _(category+op:1+tag:3)_
- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:1+tag:3)_
- [[ctrl-113|Fadal CNC Format 1 vs Format 2 critical differences]] _(category+op:1+tag:3)_

## Tags

#controller #datron #simpl #micro-milling #high-speed #post-processor #operation-finishing #operation-engraving #controller-fanuc
