---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-mc-wire-02
title: Tab cutting keeps wire EDM parts from dropping
category: machining
domain: document_learned
knowledge_type: tip
confidence: 88
source: document:mastercam_wire_tutorial@ch2
created_at: 2026-03-01
usage_count: 0
tags: ["wire-edm", "tab", "slug", "glue-stop", "workholding", "operation:profiling", "operation:grinding", "operation:edm"]
material_groups: []
operation_types: ["profiling", "grinding", "edm"]
content_hash: a49f3d98c3128c7809ade3afda37c9a576027629a8be6551f820d8a2c0ac15d2
mirror_ts: 2026-05-05T13:36:02.112Z
mirror_engine: TribalVaultPopulatorEngine
---

# Tab cutting keeps wire EDM parts from dropping

**Category:** `machining` · **Domain:** `document_learned`

**Confidence:** `88` · **Source:** `document:mastercam_wire_tutorial@ch2`

## Tip

When wire-cutting a closed contour, the slug drops when the cut completes — potentially damaging the part or wire. Use tab cutting: leave 1-2mm tabs (uncut bridges) to hold the slug, then snap or grind them off. Program a 'glue stop' (M01 optional stop) at tab positions so operator can apply adhesive for heavy slugs. Tab width depends on material thickness and weight. Source: Mastercam Wire Tutorial Ch.2.

## Applies to

- Operation types: `profiling`, `grinding`, `edm`

## Related tips

- [[tk-dl-mc-wire-04|No-core wire EDM toolpaths for complete material removal]] _(category+op:2+tag:4)_
- [[tk-dl-mc-wire-03|Wire EDM lead-in/lead-out geometry for burr-free cuts]] _(category+op:2+tag:3)_
- [[tk-dl-mc-wire-05|Reverse wire cutting eliminates re-threading]] _(category+op:2+tag:3)_
- [[wedm-jmd-004|Glue stop M01 between closed contours: JM Die slug control practice]] _(category+tag:5)_
- [[wedm-kb-026|Tab/slug management for closed contour cuts]] _(category+tag:5)_

## Tags

#wire-edm #tab #slug #glue-stop #workholding #operation-profiling #operation-grinding #operation-edm
