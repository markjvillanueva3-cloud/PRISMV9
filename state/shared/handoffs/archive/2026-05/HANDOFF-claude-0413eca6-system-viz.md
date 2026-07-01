---
session: claude-0413eca6
topic: system-viz
written_at: 2026-05-11T12:41:08.936Z
machine: MARKV
family: Claude
session_key: claude-0413eca6
status: active
---

# HANDOFF: claude-0413eca6
Updated: 2026-05-11T12:41:08.991Z
Family: Claude | Machine: MARKV | Session: claude-0413eca6

## STATE
System-viz Phase 2 (business+frontend+connective-tissue: 62 JM-Die customers, 667 frontend file nodes, 927 schema-engine edges, 356 engine-physics edges, 182 wiki knowledge nodes) + Phase 3a (extracted-knowledge JSON atomized: 14 vendor hubs, 29 files, 1558 record atomics) + Phase 3b (src/data TS catalogs atomized via esbuild: 18 category hubs, 141 files, 21790 record atomics, 97 imports_data edges) all shipped. Graph: 127,556 -> 152,017 nodes / 185,302 edges. Layers L7 27->97, L8 869->2149, L9 2695->26043, L1 165->832.

## RESUME
System-viz layer saturation. Phases 2 + 3a + 3b all committed (3475e8efb U-VIZ-LAYER-PHASE2, e78eeeaaf U-VIZ-LAYER-PHASE3, 1f5642dbb U-VIZ-LAYER-PHASE3B). Graph now 152,017 nodes / 185,302 edges, schema 2.28.0. Pipeline: regen-viz.mjs now passes --stack-size=8192 to every child (the 90MB graph blows the default 1MB Windows stack in JSON.stringify otherwise) — ALWAYS use that flag when running merge-augmentations.mjs / repair-graph-engine-classification.mjs / dedup-graph-nodes.mjs standalone. Next candidate units: (a) Phase 3c — un-truncate the giant tool catalogs (Emuge 13715, OSG 11550, Sandvik-2018 10685, Indexable 11541 tools are capped at 400/file; lifting the cap adds ~80k more L9 record nodes — only do if Mark asks), (b) other layer-saturation passes, (c) crosslink the new datacat L9 records to the registries that index them.

## CONTEXT

