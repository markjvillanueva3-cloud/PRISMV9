---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-197
title: Haas M138/M139 Spindle Speed Variation — chatter suppression without hardware
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: tip
confidence: 91
source: controller:haas_ngc_settings_guide
created_at: 2026-04-15
usage_count: 0
tags: ["haas", "ngc", "m138", "m139", "ssv", "spindle-speed-variation", "chatter", "thin-wall", "vibration", "setting-165", "setting-166", "material:P", "material:Steel", "material:D2 Tool Steel", "operation:finishing", "operation:boring", "operation:milling", "machine:Haas", "controller:haas"]
material_groups: ["P"]
operation_types: ["finishing", "boring", "milling"]
content_hash: 7a0eb0929d4a6ff12a493e2874155184cefe4a58ff823ed545277490f8636441
mirror_ts: 2026-05-05T13:36:01.222Z
mirror_engine: TribalVaultPopulatorEngine
---

# Haas M138/M139 Spindle Speed Variation — chatter suppression without hardware

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `91` · **Source:** `controller:haas_ngc_settings_guide`

## Tip

Spindle Speed Variation (SSV) on Haas NGC machines is activated with M138 and cancelled with M139. SSV continuously varies the spindle speed by a programmable percentage at a programmable frequency, preventing resonant chatter harmonics from building up. Settings: Setting 165 (SSV Variation) = speed variation in percent (typical 1-5%); Setting 166 (SSV Period) = variation cycle period in tenths of seconds. Programming syntax: M138 (SSV on) — the control then varies spindle speed by ±Setting_165% at the rate set by Setting_166. Effective for: thin-wall milling, long-reach boring, slender end mills, and any operation prone to regenerative chatter. Limitations: SSV is NOT a substitute for proper chatter analysis — use it after confirming the stability lobe diagram places the spindle speed near a stable region. SSV works best when the chatter frequency is well above the variation frequency. For JM Die: particularly useful when finish milling D2 tool steel die pockets with long-reach tooling where spindle speed adjustments would otherwise require manual intervention.

## Applies to

- Material groups: `P`
- Operation types: `finishing`, `boring`, `milling`

## Related tips

- [[ctrl-198|Haas G150 general pocket milling — mandatory pre-drill and subprogram boundary format]] _(category+op:2+tag:6)_
- [[ctrl-194|Haas Visual Quick Code (VQC) — conversational programming from the machine front panel]] _(category+op:2+tag:6)_
- [[ctrl-195|Haas G84.2 peck rigid tapping — software version requirement and deep tap strategy]] _(category+material:1+tag:7)_
- [[tk-dl-gcode-css-001|G96 CSS: RPM = (SFM × 12) / (π × diameter), G50 S-clamp prevents spindle overspeed]] _(category+op:3+tag:3)_
- [[ctrl-228|JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning]] _(category+material:1+op:1+tag:4)_

## Tags

#haas #ngc #m138 #m139 #ssv #spindle-speed-variation #chatter #thin-wall #vibration #setting-165 #setting-166 #material-p #material-steel #material-d2-tool-steel #operation-finishing #operation-boring #operation-milling #machine-haas #controller-haas
