---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-084
title: V-sketch as updatable machining contour
category: design
domain: document_learned
knowledge_type: tip
confidence: 93
source: document:hypercad-s-v33@p519
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "hypercad-s", "V-sketch", "machining-contour", "parametric", "operation:profiling", "operation:milling"]
material_groups: []
operation_types: ["profiling", "milling"]
content_hash: 7c7ddeae9ce587e002ec342e9e30bf6bd52b4463fef825901093fa7a54d28aec
mirror_ts: 2026-05-05T13:36:00.948Z
mirror_engine: TribalVaultPopulatorEngine
---

# V-sketch as updatable machining contour

**Category:** `design` · **Domain:** `document_learned`

**Confidence:** `93` · **Source:** `document:hypercad-s-v33@p519`

## Tip

A V-sketch can serve as a machining contour in hyperMILL jobs (v2021.1+). If you later modify the V-sketch and the contour remains closed, the machining contour of the associated job updates automatically. This enables parametric boundary editing without re-selecting geometry in the CAM browser. Faces used in milling areas are locked — use 'Unlock entities' to edit them.

## Applies to

- Operation types: `profiling`, `milling`

## Related tips

- [[tk-dl-hm-088|Virtual electrodes for identical multi-position erosion]] _(category+op:1+tag:3)_
- [[tk-dl-dfm-002|DFM design rules: wall 0.8mm metals, cavity 4×W, hole 4×D, thread M6+]] _(category+op:1+tag:1)_
- [[tk-dl-hm-118|AC stock definition: box offset with face milling contour auto-generation]] _(op:2+tag:3)_
- [[tk-dl-cnc-003|Thread sizing: M6+ recommended, max engagement 3× nominal]] _(category+op:1+tag:1)_
- [[tk-dl-hm-098|hyperMILL Contour Milling dialog: allowance and optimize start points]] _(op:2+tag:3)_

## Tags

#hypermill #hypercad-s #v-sketch #machining-contour #parametric #operation-profiling #operation-milling
