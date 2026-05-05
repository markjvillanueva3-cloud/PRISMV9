---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-post-005
title: Inverse time feed (G93) required for multi-axis — feedrate = 1/time per move
category: programming
subcategory: post_processor
domain: document_learned
knowledge_type: rule
confidence: 90
source: document:autodesk-post-processor-guide@ch8-multiaxis-feedrates
created_at: 2026-03-06
usage_count: 0
tags: ["inverse-time", "g93", "multi-axis", "feedrate", "5-axis", "feed-mode", "operation:5_axis"]
material_groups: []
operation_types: ["5_axis"]
content_hash: c7b46554d8d3268850a8b0c60591cd8586db9d903efc0801b0a219e5ac2881e7
mirror_ts: 2026-05-05T13:36:01.477Z
mirror_engine: TribalVaultPopulatorEngine
---

# Inverse time feed (G93) required for multi-axis — feedrate = 1/time per move

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:autodesk-post-processor-guide@ch8-multiaxis-feedrates`

## Tip

Most CNC controls require inverse time feed mode (G93) for simultaneous multi-axis moves. In G93, the F value represents 1/time_in_minutes for each move block. F2.0 means the move takes 0.5 minutes. The post processor calculates this from the actual tool tip speed: F = 1/(distance/desired_feedrate). Switch to G93 before multi-axis blocks and back to G94 (per-minute) for 3-axis sections. Some modern controls support FEED_DEGREE_MINUTE as an alternative that's easier to verify visually.

## Applies to

- Operation types: `5_axis`

## Related tips

- [[ctrl-183|Okuma CAS M510/M511 — Collision Avoidance System disable/enable for 5-axis machining]] _(category+op:1+tag:2)_
- [[ctrl-125|Hurco WinMax M128/M129 — Tool Center Point Management (TCPM)]] _(category+op:1+tag:2)_
- [[ctrl-141|Hurco 5-axis program header essentials — M31, M126, M140]] _(category+op:1+tag:2)_
- [[ctrl-192|Haas UMC G234 TCPC — pivot distance setup and crash prevention]] _(category+op:1+tag:2)_
- [[ctrl-159|Siemens 840D TRAORI — enabling 5-axis simultaneous TCP and tool vector output]] _(category+op:1+tag:2)_

## Tags

#inverse-time #g93 #multi-axis #feedrate #5-axis #feed-mode #operation-5_axis
