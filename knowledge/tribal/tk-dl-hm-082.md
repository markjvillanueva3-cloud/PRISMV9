---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-082
title: Draft angle analysis for mold parting and EDM
category: design
domain: document_learned
knowledge_type: tip
confidence: 92
source: document:hypercad-s-v33@p178
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "hypercad-s", "draft-angle", "mold", "EDM", "operation:edm"]
material_groups: []
operation_types: ["edm"]
content_hash: b525829aa4d37527eb2e59b7dda1d25690176d157fbaf5d5f72f064f10d6a11b
mirror_ts: 2026-05-05T13:36:01.050Z
mirror_engine: TribalVaultPopulatorEngine
---

# Draft angle analysis for mold parting and EDM

**Category:** `design` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:hypercad-s-v33@p178`

## Tip

Use Analysis → Shape draft angle to analyze draft angles and mold parting lines. Set the direction to the pull direction. Fixed steps mode: set Draft angle and Transition angle to auto-generate silhouette curves at area transitions — these become parting line candidates. Use this to identify areas requiring EDM (zero or negative draft), plan electrode placement, and verify sufficient draft for ejection.

## Applies to

- Operation types: `edm`

## Related tips

- [[tk-dl-hm-085|Electrode design critical warnings]] _(category+op:1+tag:4)_
- [[tk-dl-hm-083|Undercut analysis for machining accessibility]] _(category+op:1+tag:3)_
- [[tk-dl-hm-087|Side electrode for inaccessible erosion areas]] _(category+tag:3)_
- [[tk-dl-hm-088|Virtual electrodes for identical multi-position erosion]] _(category+tag:3)_
- [[tk-dl-cnc-017|Small features below 2.5mm require micro-machining — cost jumps significantly]] _(category+op:1+tag:1)_

## Tags

#hypermill #hypercad-s #draft-angle #mold #edm #operation-edm
