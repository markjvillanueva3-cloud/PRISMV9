---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-mcam-006
title: TECH library contains machine-specific power sequences up to 24 passes
category: programming
subcategory: cam_strategy
domain: process_engineering
knowledge_type: tip
confidence: 90
source: mastercam_wire_tutorial:page13,page45
created_at: 2026-04-15
usage_count: 0
tags: ["wire-edm", "tech-library", "power-settings", "mastercam", "mitsubishi", "makino", "register", "operation:roughing", "operation:edm", "machine:Makino", "machine:Mitsubishi", "controller:fanuc"]
material_groups: []
operation_types: ["wire_edm"]
content_hash: 4296bc5ca2d52bf2b2cb0794971aeff74d190efa662d976e715d17035e2b512a
mirror_ts: 2026-05-05T13:36:01.803Z
mirror_engine: TribalVaultPopulatorEngine
---

# TECH library contains machine-specific power sequences up to 24 passes

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `process_engineering`

**Confidence:** `90` · **Source:** `mastercam_wire_tutorial:page13,page45`

## Tip

Mastercam Wire uses TECH libraries (.TECH files) that contain manufacturer-calibrated power settings, feed rates, wire offsets, and register values for specific wire EDM machines. A TECH library can define up to 24 passes for a single material/thickness combination. Example sequences: Rough & 2 Skim(s), Rough & 3 Skim(s), Rough & 4 Skim(s). When loading a TECH library, Mastercam populates all electrical parameters (A, B, C registers), feed rates, and compensation values. Manufacturer-provided TECH libraries (Mitsubishi, Makino, Fanuc) are optimized for that machine's power supply. Always use TECH libraries for production — never manually enter power settings unless you're a Wire EDM specialist.

## Applies to

- Operation types: `wire_edm`

## Related tips

- [[wedm-jmd-001|H175 master offset: global trim variable for JM Die Mitsubishi FA-10S]] _(category+op:1+tag:4)_
- [[ctrl-238|Mitsubishi Wire EDM E-codes — power settings and pass management]] _(category+tag:6)_
- [[wedm-jmd-003|Adaptive control M90 only on rough pass — disable M91 for skims]] _(category+op:1+tag:4)_
- [[wedm-mcam-001|Makino DUO: G54/G55 WCS and radius list at program top]] _(category+op:1+tag:4)_
- [[wedm-ml-010|Makino EPAC code pattern: roughing uses 10x6 series (1006/1016/1026), finish uses 150x series]] _(category+op:1+tag:4)_

## Tags

#wire-edm #tech-library #power-settings #mastercam #mitsubishi #makino #register #operation-roughing #operation-edm #machine-makino #machine-mitsubishi #controller-fanuc
