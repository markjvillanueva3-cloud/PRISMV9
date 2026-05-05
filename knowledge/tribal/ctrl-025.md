---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-025
title: Haas UMC 5-axis TCPC setup
category: programming
domain: controller_specific
knowledge_type: failure_mode
confidence: 90
source: controller:haas_5axis_setup
created_at: 2026-03-07
usage_count: 0
tags: ["haas", "umc", "tcpc", "g234", "5-axis", "pivot-point", "operation:5_axis", "machine:Haas", "controller:fanuc"]
material_groups: []
operation_types: ["5_axis"]
content_hash: 913f29e093362736a6426c33cd5de101583cb86fe1f0059d1a833d25daea59ee
mirror_ts: 2026-05-05T13:36:01.523Z
mirror_engine: TribalVaultPopulatorEngine
---

# Haas UMC 5-axis TCPC setup

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `90` · **Source:** `controller:haas_5axis_setup`

## Tip

Haas Tool Center Point Control (TCPC, equivalent to Fanuc G43.4) is activated with G234 on UMC series. Requires: Setting 33 (Tool Offset Measure) = router geometry. Setting 256 (TCPC enabled) = ON. Pivot point set in Settings 276-281 (XYZ offsets for A and B rotary axes). Without correct pivot lengths, TCPC will crash. Test with G234 at low feed (F10) first, watching for unexpected XYZ moves.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-192|Haas UMC G234 TCPC — pivot distance setup and crash prevention]] _(category+op:1+tag:7)_
- [[ctrl-193|Haas DWO G254/G255 Dynamic Work Offsets — 5-axis 3+2 indexing workflow]] _(category+op:1+tag:4)_
- [[ctrl-152|Fanuc G43.4 vs G43.5 TCP — table vs head kinematics]] _(category+op:1+tag:3)_
- [[tk-dl-fusion-001|RTCP/TCPC compensation: ΔX = L×sin(B)×cos(C), required for all 5-axis simultaneous work]] _(category+op:1+tag:3)_
- [[ctrl-001|Fanuc AI Contour Control for 5-axis surface finish]] _(category+op:1+tag:3)_

## Tags

#haas #umc #tcpc #g234 #5-axis #pivot-point #operation-5_axis #machine-haas #controller-fanuc
