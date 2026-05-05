---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-029
title: VT collision check only works for hole machining, not milling
category: safety
domain: document_learned
knowledge_type: rule
confidence: 92
source: document:hypermill-virtual-tool-v33@p6
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "virtual-tool", "collision-check", "drilling", "hole-machining", "operation:drilling", "operation:tapping", "operation:reaming", "operation:milling"]
material_groups: []
operation_types: ["drilling", "tapping", "reaming", "milling"]
content_hash: aca404ed700579e5c48306cda8e198497b917833079a27ba5a913fd0a62d31c3
mirror_ts: 2026-05-05T13:36:01.046Z
mirror_engine: TribalVaultPopulatorEngine
---

# VT collision check only works for hole machining, not milling

**Category:** `safety` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:hypermill-virtual-tool-v33@p6`

## Tip

hyperMILL Virtual Tool collision check during automated tool selection is ONLY possible for hole machining operations (drilling, reaming, tapping) where probing points and machining depth are known. For milling operations, collision checking would require calculating NC paths first and checking each point — not feasible for performance reasons. Always verify milling tool clearance manually or via VIRTUAL Machining Center simulation.

## Applies to

- Operation types: `drilling`, `tapping`, `reaming`, `milling`

## Related tips

- [[tk-dl-mazak-006|Mazatrol auto tool development: multi-drill staging by hole diameter]] _(op:3+tag:4)_
- [[tk-vl-post-002|Post-processor testing: always use a simple test part before production]] _(category+op:2+tag:2)_
- [[nx-020|FBM Create Feature Process for Multi-Op Sequences]] _(op:3+tag:4)_
- [[ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]] _(op:3+tag:4)_
- [[tk-dl-hm-032|VMC collision check tolerance must be ≤ half tool diameter]] _(category+op:1+tag:3)_

## Tags

#hypermill #virtual-tool #collision-check #drilling #hole-machining #operation-drilling #operation-tapping #operation-reaming #operation-milling
