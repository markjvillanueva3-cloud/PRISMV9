---
name: PRISM v8.89 monolith extraction state
description: extracted/ + extracted_modules/ hold the decomposed v8.89 monolith — ~1,350 orphaned .js engine modules + a materials PATHS misconfig; source material for SFC/Master-Post/MS1/CADCAM-AI/LEARN
type: reference
originSessionId: 99eca613-008e-431a-9d5a-ef7a76ceb474
---
`H:/prism/extracted/` (91 MB, datasets — ~70% bridged) and `H:/prism/extracted_modules/` (149 MB, ~1048 ported JS engine modules — ~95% ORPHANED) are the decomposed PRISM v8.89 monolith: a 986K-line HTML build → 1,469 modules / 71 formulas / 20 algorithms / 200 gateway routes. Only ~8-12% is reachable as live MCP capability (the 8 L2 engines + machine/alarm/post/knowledge-base registries; materials registry is MISCONFIGURED — `PATHS.MATERIALS_DB` at `mcp-server/src/constants.ts:61` points at the near-empty `mcp-server/data/materials/` (3 files) instead of `extracted/materials_v9_complete/` (1,047 materials)). The ~1,350 orphaned `.js` modules are a SEPARATE, LARGER pool than the 875 "unwired" TS engines in BUILD_STATE.

Full state + per-revenue-product source map: wiki `knowledge/wiki/entities/prism-v8-89-monolith-extraction.md`. Priority order: `extracted_modules/EXTRACTION_PRIORITY_LIST.json` + `MONOLITH_MODULE_INVENTORY.json`. Tracked in revenue roadmap as `REVENUE-ROADMAP-v7.2.md §R6` (MS-MONOLITH-HARVEST).

**Why:** the user flagged this resource — "hundreds-thousands of datasets stuck in monolith files of the extracted folder, a lot has to do with what we're building right now." Big orphaned modules directly feed the revenue products: `PRISM_POST_PROCESSOR_GENERATOR.js` (6.5 MB) + `PRISM_VERIFIED_POST_DATABASE_V2.js` (5.6 MB) → Master Post; `PRISM_SIGNAL_ENHANCED.js` (7 MB) + `PRISM_PSO_OPTIMIZER.js` (8.3 MB) → SFC; `PRISM_SUBSCRIPTION_SYSTEM.js` (8.6 MB) → MS1 billing.

**How to apply:** before re-implementing any revenue feature from scratch (Master Post, SFC net-new engines, MS1 billing), FIRST survey the relevant `extracted_modules/*.js` — port what's already there, re-implement only the gap. Three quick wins (v7.2 §R6, hoisted into MS0-EXTENSION but touch core MCP code → coordinate with peer chat): `U-MONO-MAT-REPOINT` (1-line PATHS fix → 1,047 materials), `U-MONO-CATALOG-WIRE` (wire `CatalogRegistryBridgeEngine.enrichAll()` → 8 vendor tool catalogs), `U-MONO-ALGO-SURFACE` (~35 orphaned algorithms).
