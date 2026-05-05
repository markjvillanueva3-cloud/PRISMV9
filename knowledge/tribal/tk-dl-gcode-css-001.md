---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-gcode-css-001
title: G96 CSS: RPM = (SFM × 12) / (π × diameter), G50 S-clamp prevents spindle overspeed
category: programming
subcategory: sub_program
domain: document_learned
knowledge_type: rule
confidence: 92
source: document:CNCCookbook-G96-CSS
created_at: 2026-03-06
usage_count: 0
tags: ["G96", "CSS", "constant-surface-speed", "G50", "speed-clamp", "facing", "lathe", "RPM-formula", "operation:face_milling", "operation:finishing", "operation:boring", "operation:turning", "operation:milling"]
material_groups: []
operation_types: ["face_milling", "finishing", "boring", "turning", "milling"]
content_hash: 0094614c00d77dbe29580dd02f2ad49285646af46cedd47f81b37f74b0b63c74
mirror_ts: 2026-05-05T13:36:01.063Z
mirror_engine: TribalVaultPopulatorEngine
---

# G96 CSS: RPM = (SFM × 12) / (π × diameter), G50 S-clamp prevents spindle overspeed

**Category:** `programming` · **Subcategory:** `sub_program` · **Domain:** `document_learned`

**Confidence:** `92` · **Source:** `document:CNCCookbook-G96-CSS`

## Tip

Constant Surface Speed formula: RPM = (SFM × 12) / (π × Diameter_inches). As diameter decreases toward center during facing, RPM increases to maintain constant surface speed — at very small diameters, RPM approaches infinity. G50 S#### sets maximum RPM clamp (e.g., G50 S3500 limits to 3500 RPM). ALWAYS program G50 S#### before G96 to prevent spindle overspeed at small diameters. G96 is essential for good surface finish on facing operations — without it, SFM drops as diameter decreases, causing finish degradation. G97 cancels CSS and returns to direct RPM mode. Some controls use D-word for RPM limit instead of G50. CSS is primarily a lathe feature but applies to any operation where cutting diameter changes (mill-turn facing, boring).

## Applies to

- Operation types: `face_milling`, `finishing`, `boring`, `turning`, `milling`

## Related tips

- [[ctrl-184|Okuma NAVI-Mill conversational programming — capabilities, limits, and G-code interop]] _(category+op:4+tag:5)_
- [[ctrl-060|Fanuc 0i-TF turning-specific canned cycles]] _(category+op:4+tag:5)_
- [[tk-dl-mazak-007|Mazatrol unit-based programming: Common -> Material -> Process units]] _(category+op:4+tag:4)_
- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+op:4+tag:4)_
- [[ctrl-228|JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning]] _(category+op:3+tag:4)_

## Tags

#g96 #css #constant-surface-speed #g50 #speed-clamp #facing #lathe #rpm-formula #operation-face_milling #operation-finishing #operation-boring #operation-turning #operation-milling
