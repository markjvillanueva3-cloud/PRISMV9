---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-075
title: SINUMERIK Unique G-Codes Beyond ISO Standard
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: tip
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "siemens", "G-code", "non-ISO", "proprietary", "post-processor", "programming", "operation:turning", "controller:siemens"]
material_groups: []
operation_types: ["turning"]
content_hash: 7801bab6c14bd7aaef0c2a8c21d5a996e9f8e9ff61bf945c7eaef71f8fa47dac
mirror_ts: 2026-05-05T13:36:03.956Z
mirror_engine: TribalVaultPopulatorEngine
---

# SINUMERIK Unique G-Codes Beyond ISO Standard

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

SINUMERIK controllers use numerous proprietary codes not found in ISO 6983: **Path behavior**: G64 (continuous path with look-ahead), G641 (continuous path with programmable rounding via ADIS=<mm>), G642 (automatic corner rounding), G643 (path rounding with max axis acceleration), G644 (jerk-limited rounding). **Feedforward/dynamics**: FFWON/FFWOF (feedforward control on/off), SOFT/BRISK/DRIVE (jerk limitation modes). **Splines**: ASPLINE/BSPLINE/CSPLINE (Akima/B-spline/Cubic spline interpolation), BAUTO/BNAT/BTAN (spline boundary conditions). **Frames**: TRANS/ATRANS (translation), ROT/AROT (rotation), SCALE/ASCALE (scaling), MIRROR/AMIRROR (mirroring) - A-prefix means additive to current frame. **Coordinate transforms**: TRANSMIT (face-end machining on lathe), TRACYL (cylinder surface transformation), TRAANG (inclined axis machining). **Approach/retract**: G147/G148/G247/G248 (approach/retract strategies with various path types). **String variables**: R-parameters (R0-R99 user variables), $-variables (system variables for machine state). **Program control**: STOPRE (preprocessing stop), MCALL (modal subroutine call), MSG (operator messages). Understanding these non-ISO codes is critical for post-processor development and manual program editing on Siemens-controlled machines.

## Applies to

- Operation types: `turning`

## Related tips

- [[ctrl-070|ShopMill/ShopTurn Conversational Programming]] _(category+op:1+tag:5)_
- [[ctrl-076|Multi-Channel Programming and Channel Synchronization]] _(category+op:1+tag:4)_
- [[ctrl-079|TRANSMIT, TRACYL, and Special Coordinate Transformations]] _(category+op:1+tag:4)_
- [[ctrl-206|Mitsubishi turning G-code list types 2-7: feed mode and spindle speed limit differences]] _(category+op:1+tag:3)_
- [[ctrl-168|Siemens ShopMill and ShopTurn — graphical programming layer on top of 840D G-code]] _(category+op:1+tag:3)_

## Tags

#controller #siemens #g-code #non-iso #proprietary #post-processor #programming #operation-turning #controller-siemens
