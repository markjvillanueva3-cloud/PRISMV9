---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-cast-005
title: Chvorinov solidification rule: sand ts~(V/A)² vs die ts~(V/A)¹
category: physics
domain: document_learned
knowledge_type: tip
confidence: 85
source: document:mit2008-casting@solidification
created_at: 2026-03-03
usage_count: 0
tags: ["casting", "solidification", "chvorinov", "heat-transfer", "riser-design"]
material_groups: []
operation_types: []
content_hash: 8df671c0ee9f10ddbbd478e63c74dc2e15ecaec7d3b956943ca6040a4065c1b3
mirror_ts: 2026-05-05T13:36:03.217Z
mirror_engine: TribalVaultPopulatorEngine
---

# Chvorinov solidification rule: sand ts~(V/A)² vs die ts~(V/A)¹

**Category:** `physics` · **Domain:** `document_learned`

**Confidence:** `85` · **Source:** `document:mit2008-casting@solidification`

## Tip

Solidification time follows Chvorinov's rule: ts = C(V/A)^n where V=volume, A=surface area. For sand casting n=2 (heat transfer limited by sand conductivity ~0.5 W/mK), for die casting n=1 (metal mold conductivity ~200 W/mK dominates). This means thick sections in sand castings take disproportionately longer to solidify, causing more shrinkage porosity. Die casting solidifies more uniformly. Design risers to feed the last-to-solidify sections.

## Related tips

- [[wedm-web-001|Wire EDM spark reaches 12,000°C — material removal via local melting and evaporation]] _(category)_
- [[wedm-ml-006|Pulse on time has strongest causal effect on MRR (strength 0.85-0.90)]] _(category)_
- [[wedm-web-005|Longer pulse-on time reduces MRR due to ion energy sharing — shorter pulses more efficient]] _(category)_
- [[tk-dl-form-001|Spring back in bending: increases with Y/E ratio and R/t]] _(category)_
- [[tk-dl-form-002|Forging force with friction: F≈πR²Y(1+2µR/3h) — friction dominates for flat parts]] _(category)_

## Tags

#casting #solidification #chvorinov #heat-transfer #riser-design
