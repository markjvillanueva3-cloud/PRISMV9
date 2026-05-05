---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-049
title: Cross-controller post processor selection guide
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: rule
confidence: 95
source: controller:cross_reference_guide
created_at: 2026-03-07
usage_count: 0
tags: ["post-processor", "cam", "cross-controller", "selection-guide", "machine:DMG Mori", "machine:Mazak", "machine:Okuma", "machine:Doosan", "machine:Brother", "controller:fanuc", "controller:siemens", "controller:heidenhain", "controller:mazak"]
material_groups: []
operation_types: []
content_hash: dfaa539b946b90bebff3603e028edba8cde1b205d16a3d74288fffcf63ae2c40
mirror_ts: 2026-05-05T13:36:00.857Z
mirror_engine: TribalVaultPopulatorEngine
---

# Cross-controller post processor selection guide

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `95` · **Source:** `controller:cross_reference_guide`

## Tip

Critical post-processor matching: Fanuc-based machines (DN Solutions, Feeler, YCM, Hartford, Brother) — use brand-specific Fanuc post, NOT generic. Siemens-based machines (DMG MORI CELOS, Chiron, GROB, Heller, Index, EMAG, Spinner) — use Siemens 840D post with OEM-specific header. Okuma — MUST use Okuma-specific post (not Fanuc/Siemens). Mazak — use MAZATROL or EIA post, not generic Fanuc. Heidenhain — use Klartext or ISO post depending on CAM output format.

## Related tips

- [[tk-dl-g76-001|G76 threading: Fanuc P-word 6-digit encoding, constant-area pass scheduling, A58 infeed]] _(category+tag:5)_
- [[tk-dl-post-001|Smoothing/HSM control codes differ by controller — always output for 3D finishing]] _(category+tag:5)_
- [[ctrl-050|Universal probing compatibility across controllers]] _(category+tag:5)_
- [[ctrl-009|Fanuc through-spindle coolant M-codes vary by OEM]] _(category+tag:4)_
- [[ctrl-180|Okuma OSP work offset format: G15 H## is native — G54 is compatibility mode only]] _(category+tag:3)_

## Tags

#post-processor #cam #cross-controller #selection-guide #machine-dmg-mori #machine-mazak #machine-okuma #machine-doosan #machine-brother #controller-fanuc #controller-siemens #controller-heidenhain #controller-mazak
