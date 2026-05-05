---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-post-001
title: Smoothing/HSM control codes differ by controller — always output for 3D finishing
category: programming
subcategory: post_processor
domain: document_learned
knowledge_type: rule
confidence: 92
source: document:autodesk-post-processor-guide@ch4-smoothing
created_at: 2026-03-06
usage_count: 0
tags: ["smoothing", "aicc", "g5.1", "g187", "cycle832", "hsm", "post-processor", "operation:profiling", "operation:roughing", "operation:finishing", "operation:hsm", "machine:Haas", "machine:Okuma", "controller:fanuc", "controller:siemens", "controller:heidenhain"]
material_groups: []
operation_types: ["profiling", "roughing", "finishing", "hsm"]
content_hash: 351c277170f24f37328c7c7b5142e1979665e428773932e38fc44237047f3a9c
mirror_ts: 2026-05-05T13:36:01.060Z
mirror_engine: TribalVaultPopulatorEngine
---

# Smoothing/HSM control codes differ by controller — always output for 3D finishing

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:autodesk-post-processor-guide@ch4-smoothing`

## Tip

Every modern CNC has high-speed smoothing but the G-codes differ completely: Fanuc G5.1 Q1 (AI Contour Control / AICC), Haas G187 P1-P3 (P1=rough/fast, P2=medium, P3=finish/precise + E tolerance), Siemens CYCLE832(tolerance, mode) with COMPCAD (converts G01 blocks to splines), Heidenhain M120 look-ahead + M124 smoothing, Okuma corner smoothing via NC parameters. ALWAYS output the appropriate smoothing code for 3D finishing operations — without it, thousands of short linear segments cause jerky motion and witness marks. Cancel smoothing after the operation (G5.1 Q0, G187 off, CYCLE832() cancel).

## Applies to

- Operation types: `profiling`, `roughing`, `finishing`, `hsm`

## Related tips

- [[ctrl-021|Heidenhain cycle 32 for surface finish tolerance]] _(category+op:4+tag:8)_
- [[ctrl-162|Siemens 840D CYCLE832 smoothing levels and 6-digit technology code]] _(category+op:4+tag:7)_
- [[ctrl-149|Fanuc AICC smoothing levels — G05.1 Q1 R[1-10] from .cps]] _(category+op:3+tag:8)_
- [[ctrl-082|TNC 640 Cycle 32 TOLERANCE for HSM optimization]] _(category+op:4+tag:5)_
- [[ctrl-011|Siemens CYCLE832 high-speed machining settings]] _(category+op:3+tag:6)_

## Tags

#smoothing #aicc #g5-1 #g187 #cycle832 #hsm #post-processor #operation-profiling #operation-roughing #operation-finishing #operation-hsm #machine-haas #machine-okuma #controller-fanuc #controller-siemens #controller-heidenhain
