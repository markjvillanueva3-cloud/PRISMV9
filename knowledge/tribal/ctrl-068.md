---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-068
title: TOROT, TOFRAME, and TCARR Tool Orientation Commands
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: tip
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "siemens", "5-axis", "TOROT", "TOFRAME", "TCARR", "tool-orientation", "post-processor", "operation:drilling", "operation:tapping", "operation:5_axis", "machine:DMG Mori", "controller:siemens"]
material_groups: []
operation_types: ["drilling", "tapping", "5_axis"]
content_hash: c21f0dedb9ed06138d9761257c39078ea11c155f3ddab71e86c090f2cd8d22df
mirror_ts: 2026-05-05T13:36:03.947Z
mirror_engine: TribalVaultPopulatorEngine
---

# TOROT, TOFRAME, and TCARR Tool Orientation Commands

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

SINUMERIK provides specialized commands for tool orientation management in 5-axis machining: TOROT activates tool orientation tracking, rotating the coordinate frame to align with the current tool direction. When TOROT is active, XY moves occur in the plane perpendicular to the tool, enabling 2D operations (drilling, tapping) at arbitrary tool angles. TOFRAME generates a complete coordinate frame (FRAME) based on the current tool orientation, useful for subsequent 2D machining cycles at the tilted position. TCARR (Tool CARRier) manages orientable toolholder data, storing the angular offsets of angled toolholders. The system variable $TC_CARR1[n] through $TC_CARR23[n] define the toolholder kinematics. TOFFR/TOFFL/TOFFLR provide tool orientation offsets: TOFFL for lead angle offset, TOFFR for tilt angle offset. These commands work in conjunction with TRAORI and are essential for post-processor development. DMG MORI machines commonly use TOROT after CYCLE800 for 3+2 operations, while GROB machines often require specific TCARR configurations for their horizontal spindle + swivel table kinematics.

## Applies to

- Operation types: `drilling`, `tapping`, `5_axis`

## Related tips

- [[ctrl-079|TRANSMIT, TRACYL, and Special Coordinate Transformations]] _(category+op:2+tag:6)_
- [[ctrl-069|CUT2D/CUT3DC/CUT3DF 3D Tool Compensation Modes]] _(category+op:1+tag:6)_
- [[ctrl-078|SINUMERIK Post-Processor Configuration Essentials]] _(category+op:1+tag:6)_
- [[ctrl-176|Mazak Matrix vs Smooth vs 640MT controller — key programming differences]] _(category+op:2+tag:3)_
- [[ctrl-218|Hurco WinMax TVCC — tool vector canned cycles without transform plane]] _(category+op:2+tag:3)_

## Tags

#controller #siemens #5-axis #torot #toframe #tcarr #tool-orientation #post-processor #operation-drilling #operation-tapping #operation-5_axis #machine-dmg-mori #controller-siemens
