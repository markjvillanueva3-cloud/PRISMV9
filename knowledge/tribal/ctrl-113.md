---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-113
title: Fadal CNC Format 1 vs Format 2 critical differences
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: failure_mode
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "fadal", "Format-1", "Format-2", "E-offsets", "legacy", "operation:pocketing", "operation:tapping", "operation:boring", "operation:milling", "operation:engraving", "tool:tap", "controller:fanuc"]
material_groups: []
operation_types: ["pocketing", "tapping", "boring", "milling", "engraving"]
content_hash: 56ad2292db9bfd39682224458ca83b04e403b5880f81563a952ce8ec7478f98e
mirror_ts: 2026-05-05T13:36:03.997Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fadal CNC Format 1 vs Format 2 critical differences

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Fadal VMCs support two programming formats: Format 1 (Fadal native) and Format 2 (Fanuc compatible). Critical differences: Format 1 auto-resets control state, uses E1-E48 work offsets, and only needs D or H (assumes both from same offset). Format 2 requires explicit resets in program, accepts G54-G59 or E-type offsets, and REQUIRES both D and H words — omitting either will crash. Format 1 was designed for finger-cam style automation and does things automatically that may be undesirable. Format 2 is recommended for shops running mixed Fadal/Fanuc machines. Both formats support Fadal-specific canned cycles: bolt hole circle (L93NN), mill boring (L95NN), rectangular/circular pocket cycles, and engraving with serialization. The G68 axis rotation works well in both formats. Rigid tapping uses G84.2 (prepare) + G84.1 (execute) which differs from standard Fanuc G84 rigid tap.

## Applies to

- Operation types: `pocketing`, `tapping`, `boring`, `milling`, `engraving`

## Related tips

- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(category+op:4+tag:4)_
- [[ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]] _(category+op:3+tag:5)_
- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+op:3+tag:5)_
- [[ctrl-194|Haas Visual Quick Code (VQC) — conversational programming from the machine front panel]] _(category+op:3+tag:3)_
- [[ctrl-062|Fanuc M19 spindle orientation and rigid tapping]] _(category+op:2+tag:5)_

## Tags

#controller #fadal #format-1 #format-2 #e-offsets #legacy #operation-pocketing #operation-tapping #operation-boring #operation-milling #operation-engraving #tool-tap #controller-fanuc
