---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-062
title: Shared AC toolbar config via environment variable
category: setup
domain: document_learned
knowledge_type: setup_lesson
confidence: 86
source: document:Customer Toolbar
created_at: 2026-03-07
usage_count: 0
tags: ["hypermill", "automation-center", "toolbar", "standardization"]
material_groups: []
operation_types: []
content_hash: 53aff9dc6feee2a40b235d8eee412ab0fef8a1bb848ebdf032c95fceb824eafd
mirror_ts: 2026-05-05T13:36:02.898Z
mirror_engine: TribalVaultPopulatorEngine
---

# Shared AC toolbar config via environment variable

**Category:** `setup` · **Domain:** `document_learned`

**Confidence:** `86` · **Source:** `document:Customer Toolbar`

## Tip

To standardize AUTOMATION Center toolbars across users/machines, create a Windows user environment variable named HC_ADDITIONAL_HCCONFIG with the value set to a shared network folder path containing the toolbar configuration. This enables a 'customer toolbar' option in AC configuration, ensuring all CAM programmers have consistent toolbar layouts without manual per-seat setup.

## Related tips

- [[tk-dl-hm-060|AC Server mode: watch folder + batch mode for unattended runs]] _(category+tag:2)_
- [[tk-dl-hm-116|AC Basic Tutorial: complete automation script from unaligned part to NC code]] _(category+tag:2)_
- [[tk-dl-hm-119|AC Global Clearance Plane prevents calculation issues across setups]] _(category+tag:2)_
- [[tk-dl-hm-039|AUTOMATION Center hole feature recognition uses frame limits for auto job-list assignment]] _(category+tag:2)_
- [[tk-dl-hm-117|AC NCS orientation: two-face method for automatic part alignment]] _(category+tag:2)_

## Tags

#hypermill #automation-center #toolbar #standardization
