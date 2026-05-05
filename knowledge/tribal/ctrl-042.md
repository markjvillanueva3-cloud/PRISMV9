---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-042
title: Kitamura Arumatik-Mi proprietary control features
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: tip
confidence: 83
source: controller:kitamura_arumatik_overview
created_at: 2026-03-07
usage_count: 0
tags: ["kitamura", "arumatik", "fanuc-based", "thermal-compensation", "operation:5_axis", "machine:Kitamura", "controller:fanuc"]
material_groups: []
operation_types: ["5_axis"]
content_hash: 78fa6d10e181cd9161696339025e2a7bb884df6ed445720fbf4b3d84b02bf503
mirror_ts: 2026-05-05T13:36:03.699Z
mirror_engine: TribalVaultPopulatorEngine
---

# Kitamura Arumatik-Mi proprietary control features

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `83` · **Source:** `controller:kitamura_arumatik_overview`

## Tip

Kitamura's Arumatik-Mi (based on Fanuc 31i) adds: thermal displacement compensation using 8 embedded sensors (better than Fanuc standard), vibration monitoring dashboard, automatic spindle warm-up cycle, and predictive maintenance alerts. G-code is 100% Fanuc-compatible. The -Mi 5X variant adds 5-axis TCP control optimized for Kitamura's rotary table geometry. Programs written for Fanuc 31i-B5 run without modification.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-152|Fanuc G43.4 vs G43.5 TCP — table vs head kinematics]] _(category+op:1+tag:2)_
- [[tk-dl-fusion-001|RTCP/TCPC compensation: ΔX = L×sin(B)×cos(C), required for all 5-axis simultaneous work]] _(category+op:1+tag:2)_
- [[ctrl-001|Fanuc AI Contour Control for 5-axis surface finish]] _(category+op:1+tag:2)_
- [[ctrl-007|Fanuc 0i-MF vs 31i-B5: key capability differences]] _(category+op:1+tag:2)_
- [[ctrl-008|Fanuc tool center point control for 5-axis]] _(category+op:1+tag:2)_

## Tags

#kitamura #arumatik #fanuc-based #thermal-compensation #operation-5_axis #machine-kitamura #controller-fanuc
