---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-002
title: Always enable Automatic Geometry Check in hyperMILL
category: setup
subcategory: zero_setting
domain: document_learned
knowledge_type: rule
confidence: 95
source: document:hypermill-manual-en-1@p36
created_at: 2026-03-03
usage_count: 0
tags: ["hypermill", "geometry-check", "cache", "calculation", "cam-setup"]
material_groups: []
operation_types: []
content_hash: 6c42dc29e8f7f842b916190ef6602ef824ae0b49274190bae0cd0892963962a6
mirror_ts: 2026-05-05T13:36:00.834Z
mirror_engine: TribalVaultPopulatorEngine
---

# Always enable Automatic Geometry Check in hyperMILL

**Category:** `setup` · **Subcategory:** `zero_setting` · **Domain:** `document_learned`

**Confidence:** `95` · **Source:** `document:hypermill-manual-en-1@p36`

## Tip

The Automatic Geometry Check function (Setup > Settings > Calculation) should ALWAYS be enabled. When geometry is modified, it deletes outdated cache data and reconverts before calculation. Disabling this causes faulty calculations from stale cached geometry. It is active by default for good reason.

## Related tips

- [[tk-dl-hm-001|Never change measurement system mid-project in hyperMILL]] _(category+tag:2)_
- [[tk-dl-hm-061|Server-side calculation with separate project path]] _(category+tag:2)_
- [[tk-dl-hm-071|Link associative workplane to hyperMILL Frame]] _(category+tag:1)_
- [[tk-dl-hm-022|Max angle increment must match controller RTCP capability]] _(category+tag:1)_
- [[tk-dl-hm-031|Best Fit alignment eliminates manual part alignment using probing protocol]] _(category+tag:1)_

## Tags

#hypermill #geometry-check #cache #calculation #cam-setup
