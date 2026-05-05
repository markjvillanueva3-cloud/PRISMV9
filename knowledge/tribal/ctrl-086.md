---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-086
title: Heidenhain Klartext vs ISO programming — when to use which
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: anti_pattern
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "heidenhain", "Klartext", "ISO", "programming-language", "operation:profiling", "controller:heidenhain"]
material_groups: []
operation_types: ["profiling"]
content_hash: 6a1845f07aca2447dad5cb5de0a005198af2fdd4e3115f46a49af336447f1c29
mirror_ts: 2026-05-05T13:36:03.969Z
mirror_engine: TribalVaultPopulatorEngine
---

# Heidenhain Klartext vs ISO programming — when to use which

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

TNC 640 supports both Klartext (conversational) and DIN/ISO G-code. Klartext is preferred for shop-floor programming: plain-text syntax (L X+50 Y+30 R0 F500 M3), built-in cycle calls, and FK free-contour programming for incomplete drawings. ISO mode is needed when importing CAM-posted code. CRITICAL: Do not mix Klartext and ISO blocks in the same program — use separate programs and call ISO programs as subprograms from Klartext via CALL PGM. Klartext programs use .H extension, ISO programs use .I extension. Post processors must output to the correct format.

## Applies to

- Operation types: `profiling`

## Related tips

- [[ctrl-081|TNC 640 TCPM vs M128 for 5-axis tool orientation]] _(category+op:1+tag:4)_
- [[ctrl-082|TNC 640 Cycle 32 TOLERANCE for HSM optimization]] _(category+op:1+tag:4)_
- [[ctrl-021|Heidenhain cycle 32 for surface finish tolerance]] _(category+op:1+tag:3)_
- [[ctrl-020|Heidenhain Dynamic Efficiency for adaptive feed]] _(category+op:1+tag:3)_
- [[tk-dl-post-001|Smoothing/HSM control codes differ by controller — always output for 3D finishing]] _(category+op:1+tag:2)_

## Tags

#controller #heidenhain #klartext #iso #programming-language #operation-profiling #controller-heidenhain
