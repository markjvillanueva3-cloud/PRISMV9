---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cnc-020
title: Chip thinning with radial engagement <50%: increase feed to maintain chip load
category: speeds
domain: document_learned
knowledge_type: anti_pattern
confidence: 88
source: document:cnc-feeds-speeds-guide@ch6
created_at: 2026-03-03
usage_count: 0
tags: ["chip-thinning", "radial-engagement", "hsm", "feed-rate", "stepover", "operation:hsm"]
material_groups: []
operation_types: ["hsm"]
content_hash: e981343c86381e0d445e99714920dc0bb7d31afafbdfbc0cb7201c22c0a49a0c
mirror_ts: 2026-05-05T13:36:02.139Z
mirror_engine: TribalVaultPopulatorEngine
---

# Chip thinning with radial engagement <50%: increase feed to maintain chip load

**Category:** `speeds` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:cnc-feeds-speeds-guide@ch6`

## Tip

When radial engagement (stepover/tool diameter) drops below 50%, the actual chip thickness is less than the programmed feed per tooth due to geometry. At 25% radial engagement, actual chip is ~71% of programmed. At 10%, it's ~45%. Increase programmed feed rate by the chip thinning factor to maintain proper chip load and avoid rubbing. HSM strategies exploit this for higher MRR.

## Applies to

- Operation types: `hsm`

## Related tips

- [[wnc-045|Corner Rounding Maintains Feed Rate Through Direction Changes]] _(op:1+tag:3)_
- [[tk-dl-cam-003|HSM requires smooth links — minimize retracts to high Z]] _(op:1+tag:3)_
- [[mc-075|Corner rounding avoids deceleration spikes in high-speed finishing]] _(op:1+tag:3)_
- [[tk-dl-post-001|Smoothing/HSM control codes differ by controller — always output for 3D finishing]] _(op:1+tag:2)_
- [[ctrl-011|Siemens CYCLE832 high-speed machining settings]] _(op:1+tag:2)_

## Tags

#chip-thinning #radial-engagement #hsm #feed-rate #stepover #operation-hsm
