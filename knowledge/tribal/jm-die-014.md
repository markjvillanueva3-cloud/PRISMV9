---
schema_version: 1.0.0
kind: tribal_tip
id: jm-die-014
title: JM Die M90/M91 adaptive control — enable for rough cuts, disable for final skim
category: machining
domain: process_engineering
knowledge_type: tip
confidence: 91
source: jm_die_production_analysis
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "jm-die", "m90", "m91", "adaptive-servo", "asc", "mitsubishi", "fa-20s", "feed-rate", "operation:roughing", "operation:adaptive_milling", "machine:Mitsubishi"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 43e51c6505d07c6ad8ed344e9d54e1a95abd21b02ba800dcf94881050de8315a
mirror_ts: 2026-05-05T13:36:01.421Z
mirror_engine: TribalVaultPopulatorEngine
---

# JM Die M90/M91 adaptive control — enable for rough cuts, disable for final skim

**Category:** `machining` · **Domain:** `process_engineering`

**Confidence:** `91` · **Source:** `jm_die_production_analysis`

## Tip

The Mitsubishi FA-20S M90 command activates adaptive servo control (ASC), which dynamically adjusts feed rate based on spark gap stability. JM Die standard practice: M90 ON for rough cut (E1221 or E1281), first skim (E1222), and second skim (E1223). M90 OFF (M91) for final skim passes (E1224, E1225) where consistent feed rate produces better Ra. The ASC is essential for variable-thickness parts where material removal rate changes — without M90, the rough cut may undercut in thin sections or wire-break in thick sections. For uniform thickness parts, M90 is less critical but still recommended for rough and first skim.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[jm-die-004|JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825]] _(category+op:1+tag:7)_
- [[jm-die-002|JM Die E12xx standard 4-pass sequence for punch profiles — E1221-E1222-E1223-E1224]] _(category+op:1+tag:4)_
- [[jm-die-017|JM Die ITW SHAKEPROOF pattern — standard 4-pass for fastener tooling]] _(category+op:1+tag:4)_
- [[jm-die-020|JM Die program optimization target — maximize productivity while maintaining Ra and tolerance]] _(category+op:1+tag:4)_
- [[jm-die-008|JM Die A2 tool steel — slightly faster than D2, same offset cascade]] _(category+op:1+tag:4)_

## Tags

#wire-edm #jm-die #m90 #m91 #adaptive-servo #asc #mitsubishi #fa-20s #feed-rate #operation-roughing #operation-adaptive_milling #machine-mitsubishi
