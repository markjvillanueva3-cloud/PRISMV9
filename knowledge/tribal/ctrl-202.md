---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-202
title: Brother Machining Load Monitor M341/M342/M343 — automatic tool breakage detection
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: correction
confidence: 91
source: controller:brother_speedio_cps_rev44207
created_at: 2026-04-15
usage_count: 0
tags: ["brother", "speedio", "cnc-c00", "m341", "m342", "m343", "load-monitor", "tool-breakage", "safety", "tapping", "operation:roughing", "operation:drilling", "operation:tapping", "operation:milling", "machine:Brother", "tool:drill", "tool:tap"]
material_groups: []
operation_types: ["roughing", "drilling", "tapping", "milling"]
content_hash: 0d0b7093025a458d80615b7e223895cc77ff5f120eba0f13d2f307709f132be1
mirror_ts: 2026-05-05T13:36:01.223Z
mirror_engine: TribalVaultPopulatorEngine
---

# Brother Machining Load Monitor M341/M342/M343 — automatic tool breakage detection

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `91` · **Source:** `controller:brother_speedio_cps_rev44207`

## Tip

Brother Speedio (CNC-C00) supports a Machining Load Monitor that checks spindle and axis servo loads in real time: M341 — full monitor ON (detects both max overload and min underload / tool breakage), M342 — max overload only (stops on excessive load — tool collision or wrong feedrate), M343 — min underload only (stops when load drops below threshold — indicates broken tap or drill). M340 cancels monitoring. Programming pattern: output M341 before critical tapping cycles to catch both tap breakage and collisions. Use M342 alone for rough milling where slight underload is normal. Use M343 alone for tapping arrays where you only need to catch broken taps. The load thresholds are set in the Brother parameter menu (Machining Load Monitor settings). This feature is distinct from the post property useMachiningLoadMonitor in the Speedio Fusion post — set to '341', '342', or '343' to auto-output the appropriate M-code for each operation type.

## Applies to

- Operation types: `roughing`, `drilling`, `tapping`, `milling`
- Machine IDs: `brother-speedio`

## Related tips

- [[ctrl-201|Brother High Accuracy Mode A/B/M298 — 6 smoothing levels for contour vs drilling]] _(category+op:3+tag:7)_
- [[ctrl-199|Brother G77/G78 pitch-based tapping — 30+ taps per minute]] _(category+op:2+tag:8)_
- [[ctrl-036|Brother CNC-C00 high-speed tapping advantage]] _(category+op:2+tag:8)_
- [[ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]] _(category+op:3+tag:5)_
- [[ctrl-198|Haas G150 general pocket milling — mandatory pre-drill and subprogram boundary format]] _(category+op:3+tag:4)_

## Tags

#brother #speedio #cnc-c00 #m341 #m342 #m343 #load-monitor #tool-breakage #safety #tapping #operation-roughing #operation-drilling #operation-tapping #operation-milling #machine-brother #tool-drill #tool-tap
