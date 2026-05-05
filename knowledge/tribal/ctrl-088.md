---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-088
title: Haas G187 accuracy/speed control for HSM
category: programming
domain: controller_specific
knowledge_type: tip
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "haas", "HSM", "G187", "surface-finish", "accuracy", "operation:roughing", "operation:finishing", "operation:hsm", "machine:Haas", "controller:haas"]
material_groups: []
operation_types: ["roughing", "finishing", "hsm"]
content_hash: 9653e6fd02a82e124dac6e698dcbe3664a1f5d208f39165ee1f123bc9da86779
mirror_ts: 2026-05-05T13:36:03.970Z
mirror_engine: TribalVaultPopulatorEngine
---

# Haas G187 accuracy/speed control for HSM

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

G187 controls the trade-off between accuracy and speed on Haas NGC machines. P1=rough (fastest, least accurate), P2=medium, P3=finish (slowest, most accurate). E value sets custom tolerance in inches (e.g., E0.0005). For HSM: use G187 P1 E0.005 for roughing (max MRR), G187 P3 E0.0002 for finishing (best surface). G187 dramatically affects 3D surface quality — forgetting to switch from P1 to P3 before finishing is a common cause of poor surface finish on Haas machines. G187 is modal and persists until changed or reset.

## Applies to

- Operation types: `roughing`, `finishing`, `hsm`

## Related tips

- [[ctrl-082|TNC 640 Cycle 32 TOLERANCE for HSM optimization]] _(category+op:3+tag:6)_
- [[ctrl-099|Hurco UltiMotion — 10,000-block look-ahead for HSM]] _(category+op:3+tag:6)_
- [[ctrl-189|Haas G187 P-level and E-tolerance — complete smoothing guide]] _(category+op:2+tag:7)_
- [[ctrl-162|Siemens 840D CYCLE832 smoothing levels and 6-digit technology code]] _(category+op:3+tag:4)_
- [[tk-dl-post-001|Smoothing/HSM control codes differ by controller — always output for 3D finishing]] _(category+op:3+tag:4)_

## Tags

#controller #haas #hsm #g187 #surface-finish #accuracy #operation-roughing #operation-finishing #operation-hsm #machine-haas #controller-haas
