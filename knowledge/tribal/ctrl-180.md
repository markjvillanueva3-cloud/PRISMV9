---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-180
title: Okuma OSP work offset format: G15 H## is native — G54 is compatibility mode only
category: programming
subcategory: cam_strategy
domain: cam_software
knowledge_type: rule
confidence: 96
source: controller:okuma_osp_p300_operator_manual
created_at: 2026-04-15
usage_count: 0
tags: ["okuma", "osp", "work-offsets", "g15", "h-code", "fanuc-comparison", "wcs", "post-processor", "alarm", "min-file", "operation:turning", "operation:hsm", "machine:Okuma", "controller:fanuc", "controller:okuma"]
material_groups: []
operation_types: ["turning", "hsm"]
content_hash: 482fa9d09ca0c6bec60fcbda9c16d94602bef504128ced26ac59db62b27eb16d
mirror_ts: 2026-05-05T13:36:00.819Z
mirror_engine: TribalVaultPopulatorEngine
---

# Okuma OSP work offset format: G15 H## is native — G54 is compatibility mode only

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `cam_software`

**Confidence:** `96` · **Source:** `controller:okuma_osp_p300_operator_manual`

## Tip

Okuma OSP uses G15 H## for work offsets, not G54–G59. Format: G15 H1 through G15 H200 (H0 = machine coordinate system, equivalent to Fanuc G53). The Autodesk Fusion/HSM post uses: wcsDefinitions = {format:'G15 H##', range:[1,200]}. On OSP-P200 only H1–H99 are available. G54 is accepted only in Fanuc-compatibility mode (machine parameter required) but G15 H## is the correct native form — posts configured for Fanuc G54 output will trigger 'UNDEFINED G CODE' alarms on a standard OSP. In Mastercam: set Work Coordinate to 'Other' and prefix 'G15 H'. In HyperMILL: select the OSP post package (not generic ISO/Fanuc). In JM Die's Okuma lathe (.MIN programs), the header always uses G15 H1 — verify this if editing legacy programs.

## Applies to

- Operation types: `turning`, `hsm`

## Related tips

- [[ctrl-005|Fanuc high-speed peck drilling G73 vs G83]] _(category+op:2+tag:3)_
- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+op:2+tag:3)_
- [[ctrl-225|JM Die Okuma lathe program structure — NAT subroutines with bar feeder loop]] _(category+op:1+tag:4)_
- [[ctrl-226|JM Die Okuma G85/G87 canned roughing and finishing — pattern turning cycles]] _(category+op:1+tag:4)_
- [[ctrl-228|JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning]] _(category+op:1+tag:4)_

## Tags

#okuma #osp #work-offsets #g15 #h-code #fanuc-comparison #wcs #post-processor #alarm #min-file #operation-turning #operation-hsm #machine-okuma #controller-fanuc #controller-okuma
