---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cnc-006
title: Never let chip load drop below 0.004' — rubbing destroys tools
category: speeds
domain: document_learned
knowledge_type: anti_pattern
confidence: 90
source: document:cnc-feeds-speeds-guide@ch5
created_at: 2026-03-03
usage_count: 0
tags: ["chip-load", "rubbing", "minimum-feed", "tool-wear", "carbide"]
material_groups: []
operation_types: []
content_hash: d47378e7c44adad4763cd655d804251b238b03fefa63b403dde91370ad0ad933
mirror_ts: 2026-05-05T13:36:01.464Z
mirror_engine: TribalVaultPopulatorEngine
---

# Never let chip load drop below 0.004" — rubbing destroys tools

**Category:** `speeds` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:cnc-feeds-speeds-guide@ch5`

## Tip

Minimum chip load threshold for carbide end mills is approximately 0.004" (0.1mm) per tooth. Below this, the tool rubs instead of cutting, generating excessive heat and accelerating wear. This is the #1 cause of premature tool failure in hobby/small CNC shops. When in doubt, increase feed rate rather than decrease it.

## Related tips

- [[tk-dl-cnc-020|Chip thinning with radial engagement <50%: increase feed to maintain chip load]] _(category)_
- [[tk-dl-cnc-005|HSS surface speed table: Al 250, Brass 200, Mild Steel 110, Stainless 30 SFM]] _(category)_
- [[dyn-001|Dynamic Mill uses full flute length to maximize material removal and tool life]] _(tag:1)_
- [[hm-006|hyperMILL Optimised Roughing maintains constant tool engagement for extended tool life]] _(tag:1)_
- [[jm-die-007|JM Die D2 tool steel parameters — optimal for cold heading die cavities]] _(tag:1)_

## Tags

#chip-load #rubbing #minimum-feed #tool-wear #carbide
