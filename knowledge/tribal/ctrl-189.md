---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-189
title: Haas G187 P-level and E-tolerance — complete smoothing guide
category: programming
domain: controller_specific
knowledge_type: anti_pattern
confidence: 96
source: controller:haas_ngc_programming_manual
created_at: 2026-04-15
usage_count: 0
tags: ["haas", "ngc", "g187", "smoothing", "surface-finish", "accuracy", "roughing", "finishing", "setting-191", "operation:roughing", "operation:finishing", "machine:Haas", "controller:haas"]
material_groups: []
operation_types: ["roughing", "finishing"]
content_hash: dfd8081809b756f68d74039e5a9ec709ac5033587a66dab4a5645a8f812c5f3b
mirror_ts: 2026-05-05T13:36:00.820Z
mirror_engine: TribalVaultPopulatorEngine
---

# Haas G187 P-level and E-tolerance — complete smoothing guide

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `96` · **Source:** `controller:haas_ngc_programming_manual`

## Tip

G187 controls the accuracy/speed trade-off on every Haas NGC machine. Three P levels: P1 (roughing) = fastest motion, largest path deviation; P2 (medium) = balanced default; P3 (finishing) = slowest, tightest path, best surface quality. The optional E word sets a custom tolerance in current units (inches or mm). Examples: G187 P1 E0.005 (rough, 0.005in tolerance), G187 P2 (medium, default tolerance), G187 P3 E0.0002 (finish, 0.0002in tolerance). E range is 0.0001 to 0.9999 (inch) or 0.001 to 25.4 (mm). G187 is modal — once set it persists until changed. Forgetting to switch from P1 to P3 before a finish pass is the most common cause of poor Haas surface finish. Critical: do NOT change G187 level while tool length compensation is active — cancel G49 first if Setting 191 requires it. Setting 191 (Smoothing Tolerance) sets the P3 default tolerance for the machine; G187 E overrides it per-operation.

## Applies to

- Operation types: `roughing`, `finishing`

## Related tips

- [[ctrl-088|Haas G187 accuracy/speed control for HSM]] _(category+op:2+tag:7)_
- [[ctrl-198|Haas G150 general pocket milling — mandatory pre-drill and subprogram boundary format]] _(category+op:2+tag:6)_
- [[ctrl-022|Haas NGC Setting 191 for smoothing tolerance]] _(category+op:1+tag:8)_
- [[ctrl-162|Siemens 840D CYCLE832 smoothing levels and 6-digit technology code]] _(category+op:2+tag:5)_
- [[ctrl-149|Fanuc AICC smoothing levels — G05.1 Q1 R[1-10] from .cps]] _(category+op:2+tag:5)_

## Tags

#haas #ngc #g187 #smoothing #surface-finish #accuracy #roughing #finishing #setting-191 #operation-roughing #operation-finishing #machine-haas #controller-haas
