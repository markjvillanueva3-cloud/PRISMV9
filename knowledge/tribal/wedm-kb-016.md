---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-kb-016
title: Thermal distortion in thick sections: stress relief first
category: troubleshooting
domain: process_engineering
knowledge_type: tip
confidence: 91
source: handbook:klocke_2013_ch8
created_at: 2026-04-07
usage_count: 0
tags: ["wire-edm", "thick-section", "thermal-distortion", "stress-relief", "dimensional-accuracy", "material:P", "material:Steel", "material:D2 Tool Steel", "material:H", "material:Hardened Steel", "operation:roughing"]
material_groups: ["H"]
operation_types: ["wire_edm"]
content_hash: 486bd2777dceac88337cd6792602d5e42d3b51a9e95e475562cf8c0c704e2102
mirror_ts: 2026-05-05T13:36:01.415Z
mirror_engine: TribalVaultPopulatorEngine
---

# Thermal distortion in thick sections: stress relief first

**Category:** `troubleshooting` · **Domain:** `process_engineering`

**Confidence:** `91` · **Source:** `handbook:klocke_2013_ch8`

## Tip

When wire-cutting thick hardened steel (>75mm), residual stresses from heat treatment cause the cut to open or close during machining. The part literally moves while you're cutting it — the wire follows a straight path but the part shifts. Mitigation: (1) stress-relieve before WEDM (sub-critical anneal at 550°C for 2h for D2/A2), (2) leave 0.5mm stock and let the part 'breathe' after rough cut, (3) re-reference before skim passes. This is the #1 cause of dimensional errors in thick WEDM work.

## Applies to

- Material groups: `H`
- Operation types: `wire_edm`

## Related tips

- [[wedm-sp-002|Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes]] _(category+op:1+tag:4)_
- [[sc2-057|Skim Cuts for Surface Finish and Dimensional Accuracy]] _(material:1+op:1+tag:6)_
- [[wedm-kb-009|Material affects achievable Ra: hardened steel is better than aluminum]] _(material:1+op:1+tag:6)_
- [[mc-120|Skim cuts in wire EDM progressively improve surface finish and dimensional accuracy]] _(material:1+op:1+tag:6)_
- [[jm-die-002|JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224]] _(material:1+op:1+tag:5)_

## Tags

#wire-edm #thick-section #thermal-distortion #stress-relief #dimensional-accuracy #material-p #material-steel #material-d2-tool-steel #material-h #material-hardened-steel #operation-roughing
