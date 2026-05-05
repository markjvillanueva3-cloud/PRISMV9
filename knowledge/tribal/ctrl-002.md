---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-002
title: Fanuc Nano Smoothing vs AI Contour Control
category: programming
domain: controller_specific
knowledge_type: tip
confidence: 88
source: controller:fanuc_smoothing_guide
created_at: 2026-03-07
usage_count: 0
tags: ["fanuc", "nano-smoothing", "aicc", "nurbs", "hsm", "operation:profiling", "operation:5_axis", "controller:fanuc"]
material_groups: []
operation_types: ["profiling", "5_axis"]
content_hash: 9a509d203ffd30edc253c9aeaab5a14a7a8535b44f0bfbea74fe1e08572a16b6
mirror_ts: 2026-05-05T13:36:02.211Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc Nano Smoothing vs AI Contour Control

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `88` · **Source:** `controller:fanuc_smoothing_guide`

## Tip

Fanuc offers two smoothing modes: AI Contour Control (G05.1 Q1) optimizes acceleration/deceleration for contouring. Nano Smoothing (G05.1 Q2) converts short line segments into smooth NURBS curves internally. Use AICC for general 3+2 axis work, Nano Smoothing for complex freeform 5-axis. On 31i-B5 both can be active simultaneously. On 0i-MF, only basic AICC is available.

## Applies to

- Operation types: `profiling`, `5_axis`

## Related tips

- [[ctrl-001|Fanuc AI Contour Control for 5-axis surface finish]] _(category+op:2+tag:4)_
- [[ctrl-007|Fanuc 0i-MF vs 31i-B5: key capability differences]] _(category+op:2+tag:4)_
- [[ctrl-040|Fidia C40 5-axis contouring specialization]] _(category+op:2+tag:4)_
- [[ctrl-149|Fanuc AICC smoothing levels — G05.1 Q1 R[1-10] from .cps]] _(category+op:1+tag:5)_
- [[ctrl-114|Star swiss lathe Fanuc variant with NC Assist and B-axis]] _(category+op:2+tag:3)_

## Tags

#fanuc #nano-smoothing #aicc #nurbs #hsm #operation-profiling #operation-5_axis #controller-fanuc
