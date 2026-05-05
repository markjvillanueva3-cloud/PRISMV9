---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-109
title: Fidia Velocity Five and RTCP for 5-axis trajectory control
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: tip
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "fidia", "5-axis", "velocity-five", "RTCP", "DYNA", "operation:roughing", "operation:finishing", "operation:milling", "operation:5_axis"]
material_groups: []
operation_types: ["roughing", "finishing", "milling", "5_axis"]
content_hash: 1002e7481010f2cae97c65515dcce43c884e9f70d1e69c223f2232c4fb8280ad
mirror_ts: 2026-05-05T13:36:03.993Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fidia Velocity Five and RTCP for 5-axis trajectory control

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Fidia's Velocity Five is a multi-axis trajectory control technology with dynamic-selectable roughing/finishing parameters (DYNA). It reduces finish milling time on 3D profiles by 15-20% and roughing by 30-40% compared to standard mode. The RTCP (Rotary Tool Center Point) function manages tool-length compensation in 3D space for bi-rotary heads, roto-tilting tables, and combined configurations. With RTCP active, program the toolpath without considering head pivot geometry — the control inserts compensations from the NC tool table at runtime. The C40 supports up to 10,000 tools with 16-character alphanumeric IDs. ISOGRAPH CAD/CAM is integrated for 2.5D programming directly on the control. Use DYNA parameter sets to switch between aggressive roughing dynamics and smooth finishing dynamics within the same program.

## Applies to

- Operation types: `roughing`, `finishing`, `milling`, `5_axis`

## Related tips

- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:3+tag:4)_
- [[ctrl-089|Haas G150 general pocket milling — mini-CAM in G-code]] _(category+op:3+tag:4)_
- [[ctrl-105|Haas G12/G13 circular pocket milling — CW/CCW without CAM]] _(category+op:3+tag:4)_
- [[tk-dl-haas-001|Haas-specific G-codes beyond standard Fanuc: G143, G150, G154, G187, G234, G254]] _(op:4+tag:5)_
- [[ctrl-198|Haas G150 general pocket milling — mandatory pre-drill and subprogram boundary format]] _(category+op:3+tag:3)_

## Tags

#controller #fidia #5-axis #velocity-five #rtcp #dyna #operation-roughing #operation-finishing #operation-milling #operation-5_axis
