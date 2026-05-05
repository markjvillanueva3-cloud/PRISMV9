---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-018
title: Fullcut max stepdown limits plunge angle in Adaptive Pocket Only
category: speeds_feeds
subcategory: cutting_parameters
domain: document_learned
knowledge_type: tip
confidence: 90
source: document:hypermill-cam-v33@p819
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "adaptive-pocket", "fullcut", "plunge-angle", "tool-protection", "v33", "operation:pocketing", "operation:plunge_milling", "operation:adaptive_milling"]
material_groups: []
operation_types: ["pocketing", "plunge_milling", "adaptive_milling"]
content_hash: 969d6017c1353b10b454daa45bdce5f1647aadddf6526a37418cc2fd325ca4e3
mirror_ts: 2026-05-05T13:36:01.436Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fullcut max stepdown limits plunge angle in Adaptive Pocket Only

**Category:** `speeds_feeds` · **Subcategory:** `cutting_parameters` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:hypermill-cam-v33@p819`

## Tip

When using hyperMILL Adaptive Pocket Only mode, the Fullcut max stepdown parameter limits the maximum stepdown during full-width cuts (tool entering material). If this value is smaller than the vertical stepdown, the full cut is split into multiple planes. Use Reduce feedrate during full cut to protect the tool from high cutting forces during initial plunge.

## Applies to

- Operation types: `pocketing`, `plunge_milling`, `adaptive_milling`

## Related tips

- [[tk-dl-hm-016|Adaptive Pocket in Optimized Roughing auto-detects pocket shapes]] _(category+op:2+tag:5)_
- [[tk-dl-hm-036|High Performance Roughing requires fillet radius ≥5% of tool diameter]] _(category+op:2+tag:4)_
- [[tk-dl-hm-110|MAXX Machining vs traditional roughing: 50% cycle time reduction in stainless]] _(category+op:2+tag:3)_
- [[tk-dl-hm-111|MAXX Machining: 1.5x Vc and 2.5x Fz over traditional HPC]] _(category+op:2+tag:3)_
- [[tk-dl-hm-004|Use Optimised Roughing for HSC-compatible 3D roughing]] _(category+op:1+tag:2)_

## Tags

#hypermill #adaptive-pocket #fullcut #plunge-angle #tool-protection #v33 #operation-pocketing #operation-plunge_milling #operation-adaptive_milling
