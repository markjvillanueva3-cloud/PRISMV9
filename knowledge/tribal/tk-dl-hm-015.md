---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-hm-015
title: No double or superimposed surfaces in 3D milling areas
category: setup
domain: document_learned
knowledge_type: rule
confidence: 88
source: document:hypermill-manual-en-4@p761
created_at: 2026-03-03
usage_count: 0
tags: ["hypermill", "surface-cleanup", "cad-prep", "3d-milling", "nose-diving", "operation:milling"]
material_groups: []
operation_types: ["milling"]
content_hash: 610bc32f08590768f9496ced80d7767c1ebdf3b009860cef3d3c2489ce2dc937
mirror_ts: 2026-05-05T13:36:02.118Z
mirror_engine: TribalVaultPopulatorEngine
---

# No double or superimposed surfaces in 3D milling areas

**Category:** `setup` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:hypermill-manual-en-4@p761`

## Tip

hyperMILL 3D milling surfaces must not contain any double or superimposed surfaces. Also, boundary areas and edges of milling surfaces must not contain surfaces the tool cannot access (like narrow slots). These conditions cause unpredictable toolpath behavior including nose-diving. Clean up CAD geometry before CAM programming.

## Applies to

- Operation types: `milling`

## Related tips

- [[tk-dl-hm-118|AC stock definition: box offset with face milling contour auto-generation]] _(category+op:1+tag:2)_
- [[tk-dl-hm-040|Project Assistant automates initial CAM setup: model → stock → NCS → frame → post]] _(category+op:1+tag:2)_
- [[tk-dl-hm-043|NC Position: set machine zero relative to model or stock at corner/center/Z-top]] _(category+op:1+tag:2)_
- [[tk-dl-hm-050|IMTS workflow: Project Assistant → NCS align to top-Z + long-side-X → auto stock → material + machine → program]] _(category+op:1+tag:2)_
- [[tk-dl-hm-061|Server-side calculation with separate project path]] _(category+op:1+tag:2)_

## Tags

#hypermill #surface-cleanup #cad-prep #3d-milling #nose-diving #operation-milling
