---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-058
title: Fanuc Dual Check Safety (DCS) system
category: programming
domain: controller_specific
knowledge_type: tip
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "fanuc", "safety", "DCS", "STO", "SLS", "controller:fanuc"]
material_groups: []
operation_types: []
content_hash: 8f80bef68bdc82f051aa6a68ab29a40acf02df460569fa7539a0e94c842619b4
mirror_ts: 2026-05-05T13:36:03.937Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc Dual Check Safety (DCS) system

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

Fanuc Dual Check Safety (DCS) provides SIL 2 / PLd safety monitoring built into the CNC — no external safety hardware needed. Features: Safe Torque Off (STO) — removes torque from motors without cutting main power, faster restart than E-stop. Safe Limited Speed (SLS) — monitors axis/spindle speed, triggers alarm if exceeded. Safe Speed Monitor (SSM) — confirms safe speed before allowing guard door opening. Safe Position Monitor — monitors axis positions against defined safe zones. Architecture: dual-channel redundant monitoring of I/O signals, servo motors, and spindle motors. Emergency stop is monitored redundantly across both channels. Available on all current Fanuc controllers (0i-MF Plus, 31i-B5 Plus, 0i-TF Plus). Eliminates need for external safety PLCs in many applications, reducing wiring and cost.

## Related tips

- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+tag:4)_
- [[ctrl-051|Fanuc look-ahead buffer sizes by controller model]] _(category+tag:3)_
- [[ctrl-052|Fanuc Macro B variable ranges and persistence]] _(category+tag:3)_
- [[ctrl-053|Fanuc probing with G31 skip signal]] _(category+tag:3)_
- [[ctrl-054|Fanuc G37 automatic tool length measurement]] _(category+tag:3)_

## Tags

#controller #fanuc #safety #dcs #sto #sls #controller-fanuc
