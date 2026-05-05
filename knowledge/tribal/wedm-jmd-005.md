---
schema_version: 1.0.0
kind: tribal_tip
id: wedm-jmd-005
title: UV taper programs: set all H-register offsets to zero
category: programming
subcategory: cam_strategy
domain: cam_software
knowledge_type: anti_pattern
confidence: 96
source: jm_die_programs
created_at: 2026-04-14
usage_count: 0
tags: ["wire-edm", "taper", "uv-axis", "h-register", "offset", "e28xx", "mastercam", "post", "material:M", "material:Stainless Steel", "machine:Mitsubishi"]
material_groups: ["M"]
operation_types: ["wire_edm"]
content_hash: 7e3426ec4212b82e989f25cbdd63d8a4af0d6227f2f64a78f76ff5a9f514d715
mirror_ts: 2026-05-05T13:36:00.830Z
mirror_engine: TribalVaultPopulatorEngine
---

# UV taper programs: set all H-register offsets to zero

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `cam_software`

**Confidence:** `96` · **Source:** `jm_die_programs`

## Tip

In JM Die's Mitsubishi FA-10S UV taper programs (E28xx family), ALL H-register wire compensation offsets are set to zero: H1=0.0+H175, H2=0.0+H175, etc. (and H175=0.0000 as well). This is confirmed in NOZE TEST.NC — a 5-pass UV taper stainless program where all 5 H-registers are 0.0000. The reason: taper wire compensation (kerf offset for an angled wire) cannot be decomposed into a simple 2D offset. The Mastercam Mitsubishi FA post processor handles the geometric taper compensation in the UV coordinates themselves, not via H-register offsets. Using non-zero H-registers in a taper program will double-compensate and produce an incorrect taper angle. Set H=0 for all taper jobs and let the post handle geometry.

## Applies to

- Material groups: `M`
- Operation types: `wire_edm`
- Machine IDs: `mitsubishi-fa-10s`

## Related tips

- [[wedm-jmd-001|H175 master offset: global trim variable for JM Die Mitsubishi FA-10S]] _(category+op:1+tag:4)_
- [[wedm-mcam-003|Makino DUO: use line-only lead-in; never arc leads on taper programs]] _(category+op:1+tag:3)_
- [[wedm-mcam-004|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]] _(category+op:1+tag:3)_
- [[wedm-mcam-006|TECH library contains machine-specific power sequences up to 24 passes]] _(category+op:1+tag:3)_
- [[wedm-jmd-002|Always use double M78 M78 for tank fill on Mitsubishi FA-10S]] _(category+op:1+tag:2)_

## Tags

#wire-edm #taper #uv-axis #h-register #offset #e28xx #mastercam #post #material-m #material-stainless-steel #machine-mitsubishi
