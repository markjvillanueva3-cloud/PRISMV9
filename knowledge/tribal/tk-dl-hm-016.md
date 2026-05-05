---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-016
title: Adaptive Pocket in Optimized Roughing auto-detects pocket shapes
category: speeds_feeds
subcategory: feed_rate
domain: document_learned
knowledge_type: tip
confidence: 92
source: document:hypermill-cam-v33@p814-819
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "optimized-roughing", "adaptive-pocket", "hsc", "feedrate-zones", "v33", "operation:pocketing", "operation:roughing", "operation:adaptive_milling"]
material_groups: []
operation_types: ["pocketing", "roughing", "adaptive_milling"]
content_hash: 420b2ff710c445c1a374baaaaf3618717936be1e179eccd9aeea9eb61d096b93
mirror_ts: 2026-05-05T13:36:01.044Z
mirror_engine: TribalVaultPopulatorEngine
---

# Adaptive Pocket in Optimized Roughing auto-detects pocket shapes

**Category:** `speeds_feeds` · **Subcategory:** `feed_rate` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:hypermill-cam-v33@p814-819`

## Tip

hyperMILL v33 Optimized Roughing with Adaptive Pocket strategy automatically identifies rectangular, circular, and ring pocket shapes and fits optimized toolpaths. This enables higher feedrates, reduces direction changes, and produces HSC-compatible paths. The system uses 4 feedrate zones: Fullcut (initial material entry), Normal, Reduced (before corners), and Clearance (infeed movements). Set Normal feedrate higher than default Feedrate XY for best throughput.

## Applies to

- Operation types: `pocketing`, `roughing`, `adaptive_milling`

## Related tips

- [[tk-dl-hm-036|High Performance Roughing requires fillet radius ≥5% of tool diameter]] _(category+op:3+tag:5)_
- [[tk-dl-hm-110|MAXX Machining vs traditional roughing: 50% cycle time reduction in stainless]] _(category+op:3+tag:4)_
- [[tk-dl-hm-018|Fullcut max stepdown limits plunge angle in Adaptive Pocket Only]] _(category+op:2+tag:5)_
- [[tk-dl-hm-004|Use Optimised Roughing for HSC-compatible 3D roughing]] _(category+op:2+tag:4)_
- [[tk-dl-hm-017|Use Max Step Height for efficient sloped wall roughing]] _(category+op:1+tag:3)_

## Tags

#hypermill #optimized-roughing #adaptive-pocket #hsc #feedrate-zones #v33 #operation-pocketing #operation-roughing #operation-adaptive_milling
