---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-038
title: Boundary tool reference modes: Past avoids nose-diving in cavities
category: setup
domain: document_learned
knowledge_type: setup_lesson
confidence: 90
source: document:hypermill-cam-v33@p852-853
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "boundary", "tool-reference", "nose-diving", "cavity", "surface-quality", "v33"]
material_groups: []
operation_types: []
content_hash: dd3729bf1e8b3a7cbf547c49f1ecb59b32161ac739eed12a4b36e91955b35b58
mirror_ts: 2026-05-05T13:36:01.441Z
mirror_engine: TribalVaultPopulatorEngine
---

# Boundary tool reference modes: Past avoids nose-diving in cavities

**Category:** `setup` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:hypermill-cam-v33@p852-853`

## Tip

hyperMILL boundary tool reference defines how far the tool extends relative to boundary curves. To = tool shank touches boundary (exact, may leave unmachined areas). On = tool axis on boundary. Past = tool axis leaves boundary until shank clears (no nose-diving in cavities). Contact = tool stays until no surface contact (complete machining but risk of nose-diving without neighbor surfaces). For raised surfaces use Past mode. For cavities use Past to prevent nose-diving. Smooth Overlap option adds a blending zone for high surface quality at boundary edges.

## Related tips

- [[tk-dl-hm-022|Max angle increment must match controller RTCP capability]] _(category+tag:2)_
- [[tk-dl-hm-007|Boundary curve minimum distance rule]] _(category+tag:2)_
- [[tk-dl-hm-034|CONNECTED Machining performs consistency checks before NC transfer]] _(category+tag:2)_
- [[tk-dl-hm-114|Global Fitting normalizes ISO directions across patchwork surfaces]] _(category+tag:2)_
- [[tk-dl-hm-015|No double or superimposed surfaces in 3D milling areas]] _(category+tag:2)_

## Tags

#hypermill #boundary #tool-reference #nose-diving #cavity #surface-quality #v33
