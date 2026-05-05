---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-062
title: Fanuc M19 spindle orientation and rigid tapping
category: programming
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "fanuc", "spindle-orientation", "M19", "rigid-tapping", "M29", "operation:tapping", "operation:boring", "tool:tap", "controller:fanuc"]
material_groups: []
operation_types: ["tapping", "boring"]
content_hash: 2b27d9c8d9dd9c2ce62e9be46262caf0b84d995e3c66291fdf7b718a420e70e9
mirror_ts: 2026-05-05T13:36:03.941Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc M19 spindle orientation and rigid tapping

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

M19 commands the spindle to orient to a specific angular position using a position encoder. Required for: tool changes (orient spindle for ATC arm), fine boring cycle G76 (orient before shift-retract), live tooling on lathes. M19 is modal in the same group as M3/M4/M5 — issuing M19 stops the spindle and orients it. Rigid tapping: G84 with M29 (or G84.2/G84.3 on newer controls) synchronizes spindle rotation with Z-axis feed for tap-without-floating-holder. On 0i-MF Plus and 31i-B5: rigid tapping is standard. Parameters control the synchronization gain — poorly tuned rigid tapping causes tap breakage or oversized holes. For deep holes (>2xD), use G84 with peck (G83-style) if supported, or break the cycle into segments.

## Applies to

- Operation types: `tapping`, `boring`

## Related tips

- [[ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]] _(category+op:2+tag:5)_
- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+op:2+tag:5)_
- [[ctrl-113|Fadal CNC Format 1 vs Format 2 critical differences]] _(category+op:2+tag:5)_
- [[ctrl-122|Hurco WinMax BNC vs ISNC mode — critical differences]] _(category+op:2+tag:3)_
- [[ctrl-219|Hurco WinMax TVCC restrictions — G76, G87, G88 with I_J_ parameter not supported]] _(category+op:2+tag:3)_

## Tags

#controller #fanuc #spindle-orientation #m19 #rigid-tapping #m29 #operation-tapping #operation-boring #tool-tap #controller-fanuc
