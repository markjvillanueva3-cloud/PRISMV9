---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-039
title: Mitsubishi M800/M80 high-speed SSS control
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: tip
confidence: 85
source: controller:mitsubishi_m800_guide
created_at: 2026-03-07
usage_count: 0
tags: ["mitsubishi", "m800", "m80", "sss", "high-speed", "look-ahead", "operation:hsm", "operation:5_axis", "machine:Mitsubishi", "controller:fanuc"]
material_groups: []
operation_types: ["hsm", "5_axis"]
content_hash: 222223d956bb2bb4d9b6f826c69ddbca23428a106c1a5f8cd447e094064ce2df
mirror_ts: 2026-05-05T13:36:03.297Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mitsubishi M800/M80 high-speed SSS control

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `85` · **Source:** `controller:mitsubishi_m800_guide`

## Tip

Mitsubishi M800/M80 series includes SSS (Super Smooth Surface) control with 540-block look-ahead and automatic spline interpolation. Enable with G05 P10000 (high-speed mode ON) / G05 P0 (OFF). The M850W (MHI machines) adds OMR-FF (Optimum Machine Response - Feed Forward) for even smoother 5-axis motion. Mitsubishi's programming is Fanuc-compatible for basic G-codes but uses proprietary cycles for probing and 5-axis.

## Applies to

- Operation types: `hsm`, `5_axis`

## Related tips

- [[ctrl-204|Mitsubishi SSS Control II: activation, tolerance, and look-ahead tuning]] _(category+op:1+tag:7)_
- [[ctrl-205|Mitsubishi M70 vs M80 vs M800: key hardware and software capability differences]] _(category+op:1+tag:7)_
- [[ctrl-007|Fanuc 0i-MF vs 31i-B5: key capability differences]] _(category+op:2+tag:3)_
- [[ctrl-040|Fidia C40 5-axis contouring specialization]] _(category+op:2+tag:3)_
- [[ctrl-103|Makino Pro6 is Fanuc-based — standard G-codes with Makino enhancements]] _(category+op:2+tag:3)_

## Tags

#mitsubishi #m800 #m80 #sss #high-speed #look-ahead #operation-hsm #operation-5_axis #machine-mitsubishi #controller-fanuc
