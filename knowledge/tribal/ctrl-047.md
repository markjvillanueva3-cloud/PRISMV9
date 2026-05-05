---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-047
title: Fadal CNC legacy controller compatibility notes
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: tip
confidence: 82
source: controller:fadal_programming_reference
created_at: 2026-03-07
usage_count: 0
tags: ["fadal", "legacy", "fanuc-compatible", "g-code", "macro-b", "machine:Toyoda", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: f590cdc296fb176763cdae4e908f2a35b878f2213df2fe7e770ae356df30b456
mirror_ts: 2026-05-05T13:36:03.817Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fadal CNC legacy controller compatibility notes

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `82` · **Source:** `controller:fadal_programming_reference`

## Tip

Fadal CNC controllers use a modified Fanuc-compatible G-code dialect with key differences: M60 (pallet change, not M60 on Fanuc), G28 homes differently (intermediate point handling), and Fadal uses O-word numbering for programs starting at O0001. The controller supports Macro B but with limited variable range (#100-#149 only). Modern CAM posts should use 'Fadal VMC' post, not generic Fanuc. Fadal is now owned by JTEKT/Toyoda.

## Related tips

- [[ctrl-113|Fadal CNC Format 1 vs Format 2 critical differences]] _(category+tag:3)_
- [[ctrl-122|Hurco WinMax BNC vs ISNC mode — critical differences]] _(category+tag:2)_
- [[ctrl-156|Fanuc Macro B variable classes — local, common, system]] _(category+tag:2)_
- [[ctrl-029|Okuma OSP unique G-code dialect]] _(category+tag:2)_
- [[ctrl-169|Mazatrol EIA vs Mazatrol conversational — when to use each and how they differ]] _(category+tag:2)_

## Tags

#fadal #legacy #fanuc-compatible #g-code #macro-b #machine-toyoda #controller-fanuc
