---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-mcam-003
title: Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out
category: programming
subcategory: cam_strategy
domain: process_engineering
knowledge_type: tip
confidence: 89
source: mastercam_wire_tutorial:page18
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "lead-in", "lead-out", "arc", "tangent", "burr", "witness-mark", "mastercam", "operation:threading", "operation:edm"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: ce659a34d3789b0ab679cbabd59634e550190c13ea798641d794adc249c375f7
mirror_ts: 2026-05-05T13:36:38.262Z
mirror_engine: TribalVaultPopulatorEngine
---

# Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `process_engineering`

**Confidence:** `89` · **Source:** `mastercam_wire_tutorial:page18`

## Tip

For Wire EDM, optimal lead configuration uses Line+Arc for lead-in and Arc+Line for lead-out. The arc motion (60-90° sweep, 0.125-0.5mm radius) creates a tangent approach/departure that minimizes witness marks and burrs at the cut start/end. The linear portion (G1) positions the wire from the thread point to the approach arc. Mastercam default: lead-in = Line and Arc, lead-out = Arc and Line, Arc radius = 0.5mm, Arc sweep = 90°. The arc segment at the part surface reduces the probability of leaving a witness mark because the wire approaches/departs tangentially rather than perpendicular.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-mcam-010|Overlap option eliminates burrs at contour start/end junction]] _(category+op:1+tag:4)_
- [[wedm-mcam-007|Break closest entity to thread point — creates perpendicular wire approach]] _(category+op:1+tag:4)_
- [[wedm-mcam-001|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]] _(category+op:1+tag:3)_
- [[wedm-mcam-006|TECH library contains machine-specific power sequences up to 24 passes]] _(category+op:1+tag:3)_
- [[wedm-mcam-008|Maximum leadout shortens travel from contour end to cut point]] _(category+op:1+tag:3)_

## Tags

#wire-edm #lead-in #lead-out #arc #tangent #burr #witness-mark #mastercam #operation-threading #operation-edm
