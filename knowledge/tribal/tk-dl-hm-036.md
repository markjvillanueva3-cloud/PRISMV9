---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-036
title: High Performance Roughing requires fillet radius ≥5% of tool diameter
category: speeds_feeds
subcategory: chip_load
domain: document_learned
knowledge_type: rule
confidence: 93
source: document:hypermill-cam-v33@p825-828
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "high-performance-roughing", "fillet-radius", "trochoidal", "dynamic-feedrate", "v33", "operation:pocketing", "operation:roughing", "operation:milling", "operation:adaptive_milling"]
material_groups: []
operation_types: ["pocketing", "roughing", "milling", "adaptive_milling"]
content_hash: 101bb79afd19b438e152d2bf4f2fcee7ef527e0a57c07fd099833596bc3e380c
mirror_ts: 2026-05-05T13:36:00.944Z
mirror_engine: TribalVaultPopulatorEngine
---

# High Performance Roughing requires fillet radius ≥5% of tool diameter

**Category:** `speeds_feeds` · **Subcategory:** `chip_load` · **Domain:** `document_learned`

**Confidence:** `93` · **Source:** `document:hypermill-cam-v33@p825-828`

## Tip

hyperMILL High Performance Roughing (separate license) provides constant tool load with dynamic feedrates, always climb milling, and trochoidal movements for narrow areas. CRITICAL: the Fillet radius parameter must be at least 5% of the tool diameter. Opening Cut mode allows full-width entry in narrow areas; Side Mill Only mode forces trochoidal-only (no full cuts). Dense area stepover factor reduces lateral infeed in narrow zones. All movements output as G1 (no G2/G3). Min pocket size = tool diameter + 2× fillet radius.

## Applies to

- Operation types: `pocketing`, `roughing`, `milling`, `adaptive_milling`

## Related tips

- [[tk-dl-hm-016|Adaptive Pocket in Optimized Roughing auto-detects pocket shapes]] _(category+op:3+tag:5)_
- [[tk-dl-hm-110|MAXX Machining vs traditional roughing: 50% cycle time reduction in stainless]] _(category+op:3+tag:5)_
- [[tk-dl-hm-018|Fullcut max stepdown limits plunge angle in Adaptive Pocket Only]] _(category+op:2+tag:4)_
- [[ctrl-093|MAZATROL Intelligent Pocket Milling (IPM) for high-efficiency roughing]] _(op:4+tag:4)_
- [[tk-dl-hm-004|Use Optimised Roughing for HSC-compatible 3D roughing]] _(category+op:2+tag:3)_

## Tags

#hypermill #high-performance-roughing #fillet-radius #trochoidal #dynamic-feedrate #v33 #operation-pocketing #operation-roughing #operation-milling #operation-adaptive_milling
