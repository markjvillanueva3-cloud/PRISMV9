---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-061
title: Fanuc milling-specific canned cycles (0i-MF / 31i-B5)
category: programming
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "fanuc", "milling", "canned-cycles", "drilling", "tapping", "boring", "operation:drilling", "operation:tapping", "operation:boring", "operation:milling", "operation:hsm", "tool:drill", "tool:spot_drill", "controller:fanuc"]
material_groups: []
operation_types: ["drilling", "tapping", "boring", "milling", "hsm"]
content_hash: 19cb15b43730a885e39fb2df0abf25c94bfd048576b3e93d34300e28837d4a30
mirror_ts: 2026-05-05T13:36:03.940Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc milling-specific canned cycles (0i-MF / 31i-B5)

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Fanuc milling canned cycles (G73-G89 range): G73 (high-speed peck drilling — chip-breaking with partial retract), G74 (LH tapping), G76 (fine boring — orient spindle, shift, retract), G80 (cancel canned cycle), G81 (spot drill/simple drill), G82 (counterbore — dwell at bottom), G83 (deep-hole peck drilling — full retract each peck), G84 (RH tapping), G85 (boring — feed retract), G86 (boring — spindle stop, rapid retract), G87 (back boring), G88 (boring — dwell, manual retract), G89 (boring — dwell, feed retract). All cycles use R-plane (rapid-to point) and Z-depth. G98/G99 control retract level: G98 returns to initial Z level (safe for obstacles), G99 returns to R-plane (faster for repeated holes). Always use G98 when there are clamps or fixtures between holes.

## Applies to

- Operation types: `drilling`, `tapping`, `boring`, `milling`, `hsm`

## Related tips

- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+op:5+tag:8)_
- [[ctrl-219|Hurco WinMax TVCC restrictions — G76, G87, G88 with I_J_ parameter not supported]] _(category+op:4+tag:7)_
- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(category+op:4+tag:4)_
- [[ctrl-202|Brother Machining Load Monitor M341/M342/M343 — automatic tool breakage detection]] _(category+op:3+tag:5)_
- [[ctrl-036|Brother CNC-C00 high-speed tapping advantage]] _(category+op:3+tag:5)_

## Tags

#controller #fanuc #milling #canned-cycles #drilling #tapping #boring #operation-drilling #operation-tapping #operation-boring #operation-milling #operation-hsm #tool-drill #tool-spot_drill #controller-fanuc
