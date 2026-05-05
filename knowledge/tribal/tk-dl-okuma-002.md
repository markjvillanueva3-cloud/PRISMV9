---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-okuma-002
title: Okuma named variables and LAP auto-programming (G80-G88) for turning cycles
category: controller
domain: document_learned
knowledge_type: workaround
confidence: 90
source: document:Okuma-OSP-P200L-Programming-Manual
created_at: 2026-03-06
usage_count: 0
tags: ["okuma", "named-variables", "LAP", "G80-G88", "safety-barrier", "M24", "auto-programming", "turning", "operation:profiling", "operation:roughing", "operation:finishing", "operation:drilling", "operation:threading", "operation:turning", "machine:Okuma", "controller:fanuc"]
material_groups: []
operation_types: ["profiling", "roughing", "finishing", "drilling", "threading", "turning"]
content_hash: e32ec9997631a068838032b6145fd29cf9f7b43d361cf305485dd991a950a14b
mirror_ts: 2026-05-05T13:36:01.491Z
mirror_engine: TribalVaultPopulatorEngine
---

# Okuma named variables and LAP auto-programming (G80-G88) for turning cycles

**Category:** `controller` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:Okuma-OSP-P200L-Programming-Manual`

## Tip

Okuma OSP unique features: (1) Named variables: Okuma uses COMMON VARIABLE with names (VC1-VC200 common, VB1-VB100 local) instead of Fanuc # numbers. System variables: VTOFX/Z (tool offset X/Z), VMTRS (tool-change count), VSPDR (spindle speed). (2) LAP (Lathe Auto-Programming) G80-G88: G80=outside turning/grooving, G81=inside turning, G82=drilling, G83=outside grooving, G84=inside grooving, G85=outside threading, G86=inside threading, G87=outside necking, G88=inside necking. LAP takes raw geometry profile and generates roughing+finishing automatically — like a built-in CAM for simple parts. (3) Safety barriers: M24=barrier ON (machine stops if program tries to move past barrier coordinates), M25=barrier OFF. Use M24 for operator safety during bar-feeder or pallet changer operations. (4) T-code format: T0101 = tool station 01 + offset 01 (4-digit), T010101 = 6-digit format on newer controls.

## Applies to

- Operation types: `profiling`, `roughing`, `finishing`, `drilling`, `threading`, `turning`

## Related tips

- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(op:6+tag:8)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(op:5+tag:7)_
- [[tk-dl-okuma-001|CRITICAL: Okuma G28 = torque limit cancel (NOT home return!), G20 = home return]] _(category+op:3+tag:6)_
- [[esp-181|ESPRIT Process Template Chaining for Multi-Operation Sequences]] _(op:5+tag:5)_
- [[ctrl-226|JM Die Okuma G85/G87 canned roughing and finishing — pattern turning cycles]] _(op:4+tag:6)_

## Tags

#okuma #named-variables #lap #g80-g88 #safety-barrier #m24 #auto-programming #turning #operation-profiling #operation-roughing #operation-finishing #operation-drilling #operation-threading #operation-turning #machine-okuma #controller-fanuc
