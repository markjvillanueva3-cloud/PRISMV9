---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-208
title: Mitsubishi rigid tapping ,R1 syntax and program number reservation ranges
category: programming
subcategory: macro
domain: process_engineering
knowledge_type: anti_pattern
confidence: 90
source: controller:mitsubishi_m800_programming_manual
created_at: 2026-04-15
usage_count: 0
tags: ["mitsubishi", "m800", "m80", "m70", "rigid-tapping", "g84", "r1", "program-numbers", "wire-edm", "jm-die", "operation:tapping", "operation:threading", "operation:edm", "machine:Mitsubishi", "tool:tap", "controller:fanuc"]
material_groups: []
operation_types: ["tapping", "threading", "edm"]
content_hash: aff9d35041d1951ee17e9800a3ed4ed2850ff670931ba36e32308e5c37a1b915
mirror_ts: 2026-05-05T13:36:01.540Z
mirror_engine: TribalVaultPopulatorEngine
---

# Mitsubishi rigid tapping ,R1 syntax and program number reservation ranges

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `process_engineering`

**Confidence:** `90` · **Source:** `controller:mitsubishi_m800_programming_manual`

## Tip

Mitsubishi rigid tapping uses a unique syntax: append ',R1' directly to the G84 or G74 block (e.g., 'G84 Z-20.000 R5.000 F1.500,R1'). The ,R1 flag activates rigid tapping mode which synchronizes the spindle encoder directly to the Z-axis servo — no pre-command M29 is needed (unlike Fanuc). ,R0 enables floating-tap mode (using a tension/compression tap holder). For pitch-based feedrate in rigid mode, program F as the thread pitch in mm/rev (e.g., M6x1.0 thread = F1.0); the control computes the actual feed from spindle RPM automatically. Floating tap mode programs F as pitch x RPM. PROGRAM NUMBER RANGES: M80/M800 use 8-digit program numbers. Reserved ranges to avoid: O00008000-O00009999 are reserved by Mitsubishi for machine builder use (tool builder macros). O00001000-O00007999 are user-programmable. On 4-digit systems (M70): O8000-O9999 are reserved. Using reserved numbers will not prevent the program from running but may conflict with existing machine builder cycles and cause unexpected behavior. For JM Die's Mitsubishi wire EDM, program numbers O00001000+ are used for customer programs, with O00000001-O00000999 reserved for on-machine wire threading and condition macros.

## Applies to

- Operation types: `tapping`, `threading`, `edm`

## Related tips

- [[ctrl-205|Mitsubishi M70 vs M80 vs M800: key hardware and software capability differences]] _(category+op:2+tag:7)_
- [[ctrl-237|Mitsubishi Wire EDM M-codes — tank, wire, power, and adaptive control]] _(category+op:2+tag:6)_
- [[ctrl-236|Mitsubishi Wire EDM program structure — multi-pass with offset variables]] _(category+op:2+tag:6)_
- [[ctrl-204|Mitsubishi SSS Control II: activation, tolerance, and look-ahead tuning]] _(category+op:2+tag:6)_
- [[ctrl-158|Fanuc through-tool coolant M88/M89 and combined flood+through]] _(category+op:2+tag:4)_

## Tags

#mitsubishi #m800 #m80 #m70 #rigid-tapping #g84 #r1 #program-numbers #wire-edm #jm-die #operation-tapping #operation-threading #operation-edm #machine-mitsubishi #tool-tap #controller-fanuc
