---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-post-004
title: 3+2 work plane codes by controller: G68.2, CYCLE800, PLANE SPATIAL
category: programming
subcategory: post_processor
domain: document_learned
knowledge_type: anti_pattern
confidence: 90
source: document:autodesk-post-processor-guide@ch5-workPlane
created_at: 2026-03-06
usage_count: 0
tags: ["3+2", "tilted-work-plane", "g68.2", "cycle800", "plane-spatial", "euler-angles", "5-axis", "machine:Haas", "controller:fanuc", "controller:siemens", "controller:heidenhain"]
material_groups: []
operation_types: []
content_hash: a823cd6589278ecad2452f558ac6c9ed668eaaa1fa08999b794afcdd3d26e513
mirror_ts: 2026-05-05T13:36:01.476Z
mirror_engine: TribalVaultPopulatorEngine
---

# 3+2 work plane codes by controller: G68.2, CYCLE800, PLANE SPATIAL

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:autodesk-post-processor-guide@ch5-workPlane`

## Tip

For 3+2 (indexed) machining, the tilted work plane code differs completely per controller: Fanuc/Haas uses G68.2 with Euler angles (typically ZXZ rotation order), Siemens uses CYCLE800 with rotation components, Heidenhain uses PLANE SPATIAL with SPA/SPB/SPC angles. Some controllers (older Haas) don't support tilted work planes at all — they output rotary axis positions directly and the post must transform XYZ coordinates using optimize3DPositionsByMachine(). Always cancel the tilted plane (G69, CYCLE800(), PLANE RESET) before WCS changes.

## Related tips

- [[ctrl-151|Fanuc G68.2 tilted work plane — syntax and G53.1 confirmation]] _(category+tag:4)_
- [[tk-dl-post-001|Smoothing/HSM control codes differ by controller — always output for 3D finishing]] _(category+tag:4)_
- [[tk-dl-fusion-001|RTCP/TCPC compensation: ΔX = L×sin(B)×cos(C), required for all 5-axis simultaneous work]] _(category+tag:4)_
- [[ctrl-050|Universal probing compatibility across controllers]] _(category+tag:4)_
- [[ctrl-019|Heidenhain TCPM (tool center point management) for 5-axis]] _(category+tag:4)_

## Tags

#3-2 #tilted-work-plane #g68-2 #cycle800 #plane-spatial #euler-angles #5-axis #machine-haas #controller-fanuc #controller-siemens #controller-heidenhain
