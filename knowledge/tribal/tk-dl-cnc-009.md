---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cnc-009
title: Thread mill diameter must be < 70% of thread diameter
category: tooling
subcategory: tool_selection
domain: document_learned
knowledge_type: rule
confidence: 88
source: document:cnc-thread-mill-guide@technique
created_at: 2026-03-03
usage_count: 0
tags: ["thread-milling", "diameter-ratio", "synchronous", "dry-machining", "material:M", "material:Stainless Steel", "material:K", "material:Cast Iron", "material:N", "material:Aluminum", "operation:finishing", "operation:threading", "operation:milling", "tool:thread_mill"]
material_groups: ["M", "K", "N"]
operation_types: ["finishing", "threading", "milling"]
content_hash: cbada99d66135d0dd9a18b79e3647c3dd0fbfa08426b53e7269a488abdc17e1e
mirror_ts: 2026-05-05T13:36:02.137Z
mirror_engine: TribalVaultPopulatorEngine
---

# Thread mill diameter must be < 70% of thread diameter

**Category:** `tooling` · **Subcategory:** `tool_selection` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:cnc-thread-mill-guide@technique`

## Tip

When thread milling, the cutter diameter must be less than 70% of the thread's nominal diameter to ensure proper helical interpolation clearance. Synchronous (climb) milling is preferred for thread milling — produces better surface finish and less burr. Dry machining is preferred except for stainless, aluminum, and cast iron which benefit from coolant.

## Applies to

- Material groups: `M`, `K`, `N`
- Operation types: `finishing`, `threading`, `milling`

## Related tips

- [[gc-005|Thread milling uses helical interpolation for precision internal threads]] _(material:2+op:2+tag:8)_
- [[mc-157|Chip break peck patterns must be tuned to material type and hole depth ratio]] _(material:3+tag:7)_
- [[mc-100|Material-specific cut parameters in tool library store proven recipes per material]] _(category+material:2+tag:4)_
- [[tk-dl-cnc-005|HSS surface speed table: Al 250, Brass 200, Mild Steel 110, Stainless 30 SFM]] _(material:3+tag:6)_
- [[tk-dl-cnc-007|Flute count by material: Al=2-3, Steel=4, Cast Iron=5-6]] _(category+material:2+tag:4)_

## Tags

#thread-milling #diameter-ratio #synchronous #dry-machining #material-m #material-stainless-steel #material-k #material-cast-iron #material-n #material-aluminum #operation-finishing #operation-threading #operation-milling #tool-thread_mill
