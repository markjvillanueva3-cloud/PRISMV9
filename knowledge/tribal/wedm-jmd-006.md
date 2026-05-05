---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-jmd-006
title: Skim pass feed rate does NOT monotonically decrease — peak at pass 3
category: speeds_feeds
subcategory: feed_rate
domain: process_engineering
knowledge_type: correction
confidence: 93
source: jm_die_programs
created_at: 2026-04-14
usage_count: 0
tags: ["wire-edm", "feed-rate", "skim-pass", "e12xx", "e28xx", "mitsubishi", "fa-10s", "pass-sequence", "operation:roughing"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 6fb29c121a2c3b34de1f5624aaf0a66be81f1a0a2600418806b52e545811dc7d
mirror_ts: 2026-05-05T13:36:01.030Z
mirror_engine: TribalVaultPopulatorEngine
---

# Skim pass feed rate does NOT monotonically decrease — peak at pass 3

**Category:** `speeds_feeds` · **Subcategory:** `feed_rate` · **Domain:** `process_engineering`

**Confidence:** `93` · **Source:** `jm_die_programs`

## Tip

Common intuition says each successive WEDM skim pass should be slower (finer cut = slower). JM Die's actual production programs contradict this. In the E28xx taper 5-pass family (NOZE TEST.NC): Pass1=F0.16, Pass2=F0.23, Pass3=F0.26, Pass4=F0.30, Pass5=no feed specified. In the E12xx standard 4-pass family: Pass1=F0.12, Pass2=F0.24, Pass3=F0.21, Pass4=F0.20. The pattern is clear: Pass 2 is significantly faster than Pass 1, Pass 3 is sometimes faster than Pass 2, and final passes slow slightly. Explanation: Pass 1 (rough) is feed-rate limited by debris clearing; Pass 2 removes the bulk of recast and runs fast because discharge craters are still relatively large; later passes slow as crater size shrinks and spark energy must be reduced. Never slow all skim passes uniformly — use the E-code family's calibrated feed sequence.

## Applies to

- Operation types: `wire_edm`
- Machine IDs: `mitsubishi-fa-10s`

## Related tips

- [[wedm-jmd-008|Defense/ammo tooling: use E12xx heavy 5-pass with F0.06 rough feed for thread form integrity]] _(category+op:1+tag:3)_
- [[wedm-kb-008|Skim pass count vs Ra: diminishing returns after 4 passes]] _(category+op:1+tag:3)_
- [[wedm-kb-023|Reduce flush pressure during skim passes]] _(category+op:1+tag:3)_
- [[wedm-kb-010|Finishing pass wire speed affects Ra consistency]] _(category+op:1+tag:2)_
- [[wedm-kb-013|Thick section (>50mm): flushing efficiency degrades as 1/sqrt(thickness)]] _(category+op:1+tag:1)_

## Tags

#wire-edm #feed-rate #skim-pass #e12xx #e28xx #mitsubishi #fa-10s #pass-sequence #operation-roughing
