---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-088
title: Virtual electrodes for identical multi-position erosion
category: design
domain: document_learned
knowledge_type: tip
confidence: 88
source: document:hypercad-s-v33@p449
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "hypercad-s", "electrode", "virtual", "EDM", "operation:milling"]
material_groups: []
operation_types: ["milling"]
content_hash: 3ed518c1df0d511853e53d5d02f6c33f10439122ee3f992999bc752fb26882ec
mirror_ts: 2026-05-05T13:36:02.126Z
mirror_engine: TribalVaultPopulatorEngine
---

# Virtual electrodes for identical multi-position erosion

**Category:** `design` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:hypercad-s-v33@p449`

## Tip

For identical electrodes at multiple workpiece positions: create the master electrode, copy it to each position, convert copies to virtual electrodes with Electrode → Virtual electrode. Virtual electrodes reference the master, so changes propagate. Use Derive and milling to output each electrode as a separate *.hmc document for NC programming.

## Applies to

- Operation types: `milling`

## Related tips

- [[tk-dl-hm-084|V-sketch as updatable machining contour]] _(category+op:1+tag:3)_
- [[tk-dl-hm-085|Electrode design critical warnings]] _(category+tag:4)_
- [[tk-dl-hm-087|Side electrode for inaccessible erosion areas]] _(category+tag:4)_
- [[tk-dl-hm-082|Draft angle analysis for mold parting and EDM]] _(category+tag:3)_
- [[tk-dl-hm-086|Electrode holder library and optimized C angle]] _(category+tag:3)_

## Tags

#hypermill #hypercad-s #electrode #virtual #edm #operation-milling
