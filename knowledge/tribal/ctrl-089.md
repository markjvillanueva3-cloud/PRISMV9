---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-089
title: Haas G150 general pocket milling — mini-CAM in G-code
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: tip
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "haas", "G150", "pocket-milling", "conversational", "operation:pocketing", "operation:roughing", "operation:finishing", "operation:drilling", "operation:milling", "operation:ramping", "machine:Haas", "tool:drill"]
material_groups: []
operation_types: ["pocketing", "roughing", "finishing", "drilling", "milling", "ramping"]
content_hash: 173ca6ba3ed791f579c1d6664fa9391928a75785ba7f913d678fa0c6ce45a862
mirror_ts: 2026-05-05T13:36:03.971Z
mirror_engine: TribalVaultPopulatorEngine
---

# Haas G150 general pocket milling — mini-CAM in G-code

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

G150 is Haas's built-in pocket milling cycle — essentially a mini-CAM system in G-code. Define pocket boundary as a sub-program with line/arc moves, then G150 generates roughing toolpaths with stepover. CRITICAL: G150 requires a pre-drilled hole at full pocket depth for cutter entry — it will NOT ramp or helical-enter. Drill or helical-interpolate the entry hole before calling G150. Parameters: P (subprogram number), D (tool diameter offset), I (stepover), J (overlap), K (number of finishing passes). Useful for simple pockets when CAM is unavailable.

## Applies to

- Operation types: `pocketing`, `roughing`, `finishing`, `drilling`, `milling`, `ramping`

## Related tips

- [[ctrl-198|Haas G150 general pocket milling — mandatory pre-drill and subprogram boundary format]] _(category+op:5+tag:10)_
- [[ctrl-105|Haas G12/G13 circular pocket milling — CW/CCW without CAM]] _(category+op:4+tag:8)_
- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:4+tag:6)_
- [[ctrl-194|Haas Visual Quick Code (VQC) — conversational programming from the machine front panel]] _(category+op:3+tag:7)_
- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:4+tag:5)_

## Tags

#controller #haas #g150 #pocket-milling #conversational #operation-pocketing #operation-roughing #operation-finishing #operation-drilling #operation-milling #operation-ramping #machine-haas #tool-drill
