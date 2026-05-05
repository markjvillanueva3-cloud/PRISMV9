---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-011
title: JM Die H13 hot work steel — reduce power 20% for large dies to prevent cracking
category: machining
domain: process_engineering
knowledge_type: tip
confidence: 87
source: jm_die_production_analysis
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "h13", "hot-work", "tool-steel", "hot-heading", "extrusion", "thermal-shock", "delayed-crack", "material:P", "material:Steel", "material:H13 Tool Steel", "material:N", "material:Aluminum", "material:H", "material:Hardened (52 HRC)", "operation:adaptive_milling", "operation:edm"]
material_groups: ["H"]
operation_types: ["wire_edm"]
content_hash: 24f113e73f45087a85058d50f6a97a8fa428db06c98abde128579ad0340d9f81
mirror_ts: 2026-05-05T13:36:02.893Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die H13 hot work steel — reduce power 20% for large dies to prevent cracking

**Category:** `machining` · **Domain:** `process_engineering`

**Confidence:** `87` · **Source:** `jm_die_production_analysis`

## Tip

H13 hot work tool steel (0.4%C, 5%Cr, 1.3%Mo, 1%V) at 44-52 HRC is used at JM Die for hot heading dies and aluminum extrusion tooling. H13's lower carbon content and lower hardness make it more sensitive to thermal shock than the cold work steels. For wire EDM on FA-20S: reduce E1221 power to 80%, increase OFF time 20%, and consider using the E952 ACU (Adaptive Control Unit) mode for large cavities. H13 is also prone to delayed cracking — inspect parts 24-48 hours after wire EDM, not immediately. For H13 thicker than 3", consider stress relief (1050°F for 2 hours) before wire EDM.

## Applies to

- Material groups: `H`
- Operation types: `wire_edm`

## Related tips

- [[jm-die-009|JM Die S7 shock-resistant steel — reduce power 15% to prevent micro-cracking]] _(category+material:1+op:1+tag:8)_
- [[jm-die-007|JM Die D2 tool steel parameters — optimal for cold heading die cavities]] _(category+material:1+op:1+tag:7)_
- [[jm-die-008|JM Die A2 tool steel — slightly faster than D2, same offset cascade]] _(category+material:1+op:1+tag:6)_
- [[jm-die-010|JM Die M2 high-speed steel — aggressive roughing OK, add skim for surface hardness]] _(category+material:1+op:1+tag:6)_
- [[jm-die-002|JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224]] _(category+material:1+op:1+tag:5)_

## Tags

#wire-edm #jm-die #h13 #hot-work #tool-steel #hot-heading #extrusion #thermal-shock #delayed-crack #material-p #material-steel #material-h13-tool-steel #material-n #material-aluminum #material-h #material-hardened--52-hrc #operation-adaptive_milling #operation-edm
