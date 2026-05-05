---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-152
title: Fanuc G43.4 vs G43.5 TCP — table vs head kinematics
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: rule
confidence: 94
source: controller:fanuc_cps_rev44207
created_at: 2026-04-15
usage_count: 0
tags: ["fanuc", "g43.4", "g43.5", "tcp", "5-axis", "rtcp", "tool-center-point", "parameter", "operation:5_axis", "controller:fanuc"]
material_groups: []
operation_types: ["5_axis"]
content_hash: b26efb8dc42bfe6689ea7c628ba76ae63dc073fdbc8ed8de3fd14a29da648ad2
mirror_ts: 2026-05-05T13:36:00.905Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc G43.4 vs G43.5 TCP — table vs head kinematics

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `94` · **Source:** `controller:fanuc_cps_rev44207`

## Tip

Fanuc uses two TCP codes for 5-axis simultaneous machining. G43.4 applies to table-type (rotary table) or table/table kinematics — the tool vector is expressed in the machine coordinate system. G43.5 applies to head-type or head/table kinematics — the tool vector is expressed relative to the tilted work coordinate frame. The Fusion post automatically selects: G43.4 when machineConfiguration.isMultiAxisConfiguration() is true (table rotaries), G43.5 for non-multi-axis head configurations. Cancel TCP with G49. Important: Fanuc parameter #5006 bit 6 must = 1 if G49 causes axis motion on your machine — the post outputs a macro check: IF[PRM[5006,6]NE1]THEN#3000=91 to catch this at run time.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-008|Fanuc tool center point control for 5-axis]] _(category+op:1+tag:8)_
- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+op:1+tag:4)_
- [[ctrl-159|Siemens 840D TRAORI — enabling 5-axis simultaneous TCP and tool vector output]] _(category+op:1+tag:4)_
- [[ctrl-001|Fanuc AI Contour Control for 5-axis surface finish]] _(category+op:1+tag:4)_
- [[ctrl-007|Fanuc 0i-MF vs 31i-B5: key capability differences]] _(category+op:1+tag:4)_

## Tags

#fanuc #g43-4 #g43-5 #tcp #5-axis #rtcp #tool-center-point #parameter #operation-5_axis #controller-fanuc
