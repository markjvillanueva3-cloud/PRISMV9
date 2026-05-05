---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-haas-001
title: Run spindle warm-up after 4+ days idle (Haas O09220)
category: setup
subcategory: thermal_compensation
domain: document_learned
knowledge_type: setup_lesson
confidence: 92
source: document:haas-mill-2023@p96
created_at: 2026-03-03
usage_count: 0
tags: ["haas", "spindle", "warm-up", "thermal", "maintenance", "operation:hsm", "machine:Haas"]
material_groups: []
operation_types: ["hsm"]
content_hash: 739efe008ff8abf7e6945299a9859b5a4c73d81b87bdfeb56615848fbd49bdff
mirror_ts: 2026-05-05T13:36:38.115Z
mirror_engine: TribalVaultPopulatorEngine
---

# Run spindle warm-up after 4+ days idle (Haas O09220)

**Category:** `setup` · **Subcategory:** `thermal_compensation` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:haas-mill-2023@p96`

## Tip

On Haas mills, if the spindle has been idle for more than 4 days, run the built-in 20-minute warm-up program O09220 before machining. This gradually increases RPM to distribute spindle lubrication and reach thermal equilibrium. For consistent high-speed work, run this warm-up daily. Skipping warm-up risks bearing damage and poor initial part accuracy due to thermal growth.

## Applies to

- Operation types: `hsm`

## Related tips

- [[tk-dl-cam-015|Automatic minimum tool length calculation prevents collisions]] _(category+op:1+tag:1)_
- [[tk-dl-cnc-014|SINUMERIK CYCLE832: set tolerance, smoothing, and jerk for HSM]] _(category+op:1+tag:1)_
- [[ctrl-188|Okuma Thermo-Friendly Concept (TFC) — eliminate warm-up time without sacrificing accuracy]] _(category+tag:1)_
- [[tk-dl-haas-003|Haas HSM: Acceleration Before Interpolation + full look-ahead, 1200 ipm contour]] _(op:1+tag:3)_
- [[bc-093|Multiple Tool Libraries for Organized Tool Management]] _(category+tag:1)_

## Tags

#haas #spindle #warm-up #thermal #maintenance #operation-hsm #machine-haas
