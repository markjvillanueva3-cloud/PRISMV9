---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-065
title: Fanuc Macro B tool breakage detection pattern
category: programming
subcategory: macro
domain: controller_specific
knowledge_type: tip
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "fanuc", "macro-b", "tool-breakage", "probing", "lights-out", "automation", "material:N", "material:ABS", "controller:fanuc"]
material_groups: ["N"]
operation_types: []
content_hash: 657681062a6b975895721ab34096ed303056761ce791f590685dc145f0bf8779
mirror_ts: 2026-05-05T13:36:03.944Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc Macro B tool breakage detection pattern

**Category:** `programming` · **Subcategory:** `macro` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Practical Macro B pattern for automated tool breakage detection using G31 probing and system variables. Pattern: (1) After machining, call tool setter with G31 Z-xx F100. (2) Read skip position: #101=#5063 (Z at contact). (3) Compare to expected length stored in non-volatile variable: IF[ABS[#101-#501] GT 0.5] GOTO 900. (4) Normal path: continue program. (5) N900: #3000=101[TOOL 1 BROKEN - REPLACE]. This halts the machine with a clear alarm. Store reference lengths in #500-#999 (persist across power cycles). For multi-tool programs, use #500+tool_number as the storage variable. Add #3001 (millisecond timer) reads before/after probing to log cycle times. This pattern is the foundation of lights-out machining on Fanuc controls and works identically on 0i-MF, 31i-B5, and 0i-TF controllers.

## Applies to

- Material groups: `N`

## Related tips

- [[ctrl-056|Fanuc G10 programmatic offset setting for automation]] _(category+tag:5)_
- [[ctrl-004|Fanuc Macro B custom probing cycles]] _(category+tag:4)_
- [[ctrl-155|Fanuc Macro B skip function G31 — probing and in-process gauging]] _(category+tag:4)_
- [[ctrl-006|Fanuc tool life management M-codes]] _(category+tag:4)_
- [[ctrl-052|Fanuc Macro B variable ranges and persistence]] _(category+tag:4)_

## Tags

#controller #fanuc #macro-b #tool-breakage #probing #lights-out #automation #material-n #material-abs #controller-fanuc
