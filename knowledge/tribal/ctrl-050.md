---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-050
title: Universal probing compatibility across controllers
category: programming
subcategory: macro
domain: controller_specific
knowledge_type: rule
confidence: 92
source: controller:renishaw_compatibility
created_at: 2026-03-07
usage_count: 0
tags: ["probing", "renishaw", "cross-controller", "macro", "measurement", "machine:Haas", "machine:Okuma", "controller:fanuc", "controller:siemens", "controller:heidenhain"]
material_groups: []
operation_types: []
content_hash: 907b00495ffa97d4d71bc7ca385f8b4a601cb253b5c5b796922206e5b2a1567d
mirror_ts: 2026-05-05T13:36:01.088Z
mirror_engine: TribalVaultPopulatorEngine
---

# Universal probing compatibility across controllers

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `controller_specific`

**Confidence:** `92` · **Source:** `controller:renishaw_compatibility`

## Tip

Renishaw probing cycles work across all major controllers but with different macro call numbers: Fanuc G65 P9810-P9814, Siemens CYCLE977/978/976, Heidenhain Touch Probe Cycles 0-4/400-405/40x, Haas G65 P9995/P9023, Okuma uses proprietary O-numbers. The probe hardware (OMP60, RMP600, OTS) is universal — only the software interface differs. Blum probes use their own macro sets. Always use the correct macro package for your controller.

## Related tips

- [[ctrl-049|Cross-controller post processor selection guide]] _(category+tag:5)_
- [[tk-dl-post-001|Smoothing/HSM control codes differ by controller — always output for 3D finishing]] _(category+tag:5)_
- [[tk-dl-post-004|3+2 work plane codes by controller: G68.2, CYCLE800, PLANE SPATIAL]] _(category+tag:4)_
- [[ctrl-023|Haas macro variables and probing]] _(category+tag:4)_
- [[ctrl-016|Siemens measuring cycles CYCLE977/978 for probing]] _(category+tag:4)_

## Tags

#probing #renishaw #cross-controller #macro #measurement #machine-haas #machine-okuma #controller-fanuc #controller-siemens #controller-heidenhain
