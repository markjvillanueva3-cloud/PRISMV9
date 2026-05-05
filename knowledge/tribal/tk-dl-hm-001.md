---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-001
title: Never change measurement system mid-project in hyperMILL
category: setup
domain: document_learned
knowledge_type: anti_pattern
confidence: 95
source: document:hypermill-manual-en-1@p35
created_at: 2026-03-03
usage_count: 0
tags: ["hypermill", "units", "metric", "inch", "cam-setup"]
material_groups: []
operation_types: []
content_hash: cb9bdabe486753349a57ce0e9eb6c4d9dc3f719f5ddf34a9d8b2ecd51aee80eb
mirror_ts: 2026-05-05T13:36:00.833Z
mirror_engine: TribalVaultPopulatorEngine
---

# Never change measurement system mid-project in hyperMILL

**Category:** `setup` · **Domain:** `document_learned`

**Confidence:** `95` · **Source:** `document:hypermill-manual-en-1@p35`

## Tip

Do not change the measurement system (Metric/Inch) during CAM programming. Existing definition values will NOT be converted. Copying jobs between hyperMILL documents with different measurement systems is not allowed. Set the correct unit system at project creation and lock it.

## Related tips

- [[tk-dl-hm-002|Always enable Automatic Geometry Check in hyperMILL]] _(category+tag:2)_
- [[tk-dl-hm-071|Link associative workplane to hyperMILL Frame]] _(category+tag:1)_
- [[tk-dl-hm-022|Max angle increment must match controller RTCP capability]] _(category+tag:1)_
- [[tk-dl-hm-031|Best Fit alignment eliminates manual part alignment using probing protocol]] _(category+tag:1)_
- [[tk-dl-hm-073|Workplane on axial face/hole for drilling setups]] _(category+tag:1)_

## Tags

#hypermill #units #metric #inch #cam-setup
