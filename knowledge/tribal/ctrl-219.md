---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-219
title: Hurco WinMax TVCC restrictions — G76, G87, G88 with I_J_ parameter not supported
category: programming
subcategory: sub_program
domain: controller_specific
knowledge_type: workaround
confidence: 93
source: controller:cope_hurco_tvcc_asr_technical_note
created_at: 2026-04-15
usage_count: 0
tags: ["hurco", "winmax", "tvcc", "restrictions", "g76", "g87", "g88", "boring", "5-axis", "limitations", "operation:drilling", "operation:tapping", "operation:reaming", "operation:boring", "operation:hsm", "machine:Hurco", "tool:drill", "tool:tap", "tool:spot_drill"]
material_groups: []
operation_types: ["drilling", "tapping", "reaming", "boring", "hsm"]
content_hash: b4f47d4f2dd25b999f82babe5045abc5236e5256adeacaf8779458c757d808ea
mirror_ts: 2026-05-05T13:36:00.981Z
mirror_engine: TribalVaultPopulatorEngine
---

# Hurco WinMax TVCC restrictions — G76, G87, G88 with I_J_ parameter not supported

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `controller_specific`

**Confidence:** `93` · **Source:** `controller:cope_hurco_tvcc_asr_technical_note`

## Tip

Tool Vector Canned Cycles (TVCC) support most drilling and tapping cycles but have restrictions: (1) G76 Bore Orient when programmed with I_J_ parameter — NOT supported (I_J_ specifies orient direction relative to coordinate system, conflicts with TVCC tool vector), (2) G87 Back Boring when programmed with I_J_ parameter — NOT supported, (3) G88 Boring with Manual Feed Out — NOT supported (operator intervention incompatible with tool vector mode). All other cycles work: G81 drill, G82 spot drill, G83 peck drill, G73 high-speed peck, G84 tap, G85 ream. For operations requiring G76/G87/G88 at an angle, use G68.2 Transform Plane instead of TVCC.

## Applies to

- Operation types: `drilling`, `tapping`, `reaming`, `boring`, `hsm`

## Related tips

- [[ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]] _(category+op:4+tag:7)_
- [[ctrl-218|Hurco WinMax TVCC — tool vector canned cycles without transform plane]] _(category+op:2+tag:9)_
- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+op:4+tag:4)_
- [[ctrl-036|Brother CNC-C00 high-speed tapping advantage]] _(category+op:3+tag:5)_
- [[tk-dl-mazak-006|Mazatrol auto tool development: multi-drill staging by hole diameter]] _(category+op:3+tag:4)_

## Tags

#hurco #winmax #tvcc #restrictions #g76 #g87 #g88 #boring #5-axis #limitations #operation-drilling #operation-tapping #operation-reaming #operation-boring #operation-hsm #machine-hurco #tool-drill #tool-tap #tool-spot_drill
