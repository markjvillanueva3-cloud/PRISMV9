---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-sp-003
title: SP43/SP64 High Precision vs Both Away: choose High Precision for ±0.0001' tolerance, Both Away for form accuracy
category: machining
domain: process_engineering
knowledge_type: rule
confidence: 91
source: mastercam:makino_sp43_sp64_tech_file_mgw_s
created_at: 2026-04-14
usage_count: 0
tags: ["wire-edm", "makino", "sp43", "sp64", "high-precision", "both-away", "tolerance", "form-accuracy", "recast", "distortion", "d2", "a2", "s7", "material:P", "material:1045 Steel", "material:Steel", "material:D2 Tool Steel", "material:S7 Tool Steel", "material:H", "material:Hardened (60 HRC)", "machine:Makino"]
material_groups: ["H", "P"]
operation_types: ["wire_edm"]
content_hash: 2a44e01adb5258fdc5354146172934ba4ae1483b442b2a5faa79be237903a412
mirror_ts: 2026-05-05T13:36:01.419Z
mirror_engine: TribalVaultPopulatorEngine
---

# SP43/SP64 High Precision vs Both Away: choose High Precision for ±0.0001" tolerance, Both Away for form accuracy

**Category:** `machining` · **Domain:** `process_engineering`

**Confidence:** `91` · **Source:** `mastercam:makino_sp43_sp64_tech_file_mgw_s`

## Tip

The Makino SP43/SP64 MGW-S library offers two primary cutting methods for steel: High Precision and Both Away. High Precision (E-packs 1025/1035/1045/1055/1065) uses tighter servo references and lower spark energy on each pass — optimized for achieving dimensional tolerance ±0.0001" (±2.5µm) on straightforward 2D profiles with predictable deflection. Both Away (E-packs 1026/1036/1046) alternates the direction of skim passes to cancel the directional recast layer and thermal bow — preferred when the part has a tendency to bow or stress-relieve during cutting (pre-hardened tool steels above 60 HRC, asymmetric cross-sections). Both Away typically requires one additional skim pass to reach equivalent Ra, adding ~15–25% cut time. For JM Die die-making: use High Precision for standard die openings in D2/A2, Both Away for thin-web sections in S7 or pre-hardened 4140 where distortion is a concern.

## Applies to

- Material groups: `H`, `P`
- Operation types: `wire_edm`

## Related tips

- [[wedm-mcam-004|Both Away Precision beats High Speed for die work: 2~2.5µm Ra in 5 passes on Makino DUO]] _(category+material:2+op:1+tag:5)_
- [[jm-die-009|JM Die S7 shock-resistant steel — reduce power 15% to prevent micro-cracking]] _(category+material:1+op:1+tag:7)_
- [[wedm-sp-006|SP43/SP64 copper (Cu) library: 3-pass High Precision achieves Ra 12 µin — use for electrode and fixture cutting]] _(category+material:1+op:1+tag:7)_
- [[jm-die-007|JM Die D2 tool steel parameters — optimal for cold heading die cavities]] _(category+material:1+op:1+tag:6)_
- [[jm-die-002|JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224]] _(category+material:1+op:1+tag:5)_

## Tags

#wire-edm #makino #sp43 #sp64 #high-precision #both-away #tolerance #form-accuracy #recast #distortion #d2 #a2 #s7 #material-p #material-1045-steel #material-steel #material-d2-tool-steel #material-s7-tool-steel #material-h #material-hardened--60-hrc #machine-makino
