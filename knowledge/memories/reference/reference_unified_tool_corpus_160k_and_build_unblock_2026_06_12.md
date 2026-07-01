---
name: reference_unified_tool_corpus_160k_and_build_unblock_2026_06_12
description: "Unified ToolCatalogEngine corpus measured at 160,596 (answers \"way more than 62.7K\"); G1 cross-pipeline id double-load finding; ESM __dir loader fix; fleet-wide esbuild build-freeze fix (file:// externalize)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.230Z
aliases: reference_unified_tool_corpus_160k_and_build_unblock_2026_06_12
---


slot:romeo 2026-06-12 (/yolo-mode /loop, host recovered mid-session). Four linked findings closing the operator's "we should have way more than 62.7k tools" question and unblocking dist.

## 1. Unified corpus total = 160,596 tools (DEFINITIVE)
`scripts/verify-unified-corpus-total.ts` (npx tsx) measures the real unified `toolCatalogEngine` corpus:
- **94,314** standard `.ts`-getter tools (loaded in `ToolCatalogEngine` constructor `_loadStandardTools()`, reading the `src/data/*-tools.json` caches that U-DBCON-CACHE-SYNC repopulated).
- **+66,282** unique from `catalogCorpusLoaderEngine.load()` (CATALOG_INDEX `*-extracted.json` slice: 67,178 normalized, 896 dup ids).
- **= 160,596** unified `stats().total_tools`. The "62.7K" the operator doubted was ONLY the CATALOG_INDEX slice (now 67,178). Confirmed way larger.
- by_type spread: end_mill 66,555 · drill 51,669 · insert 13,711 · tap 10,466 · turning_tool 8,816 · ball_mill 3,442 (full vendor universe; JM's 218-tool crib is a curated subset, taps/reamers legit for the universe even though JM doesn't run them).

## 2. G1 finding — cross-pipeline id double-load (CONFIRMED + FIXED, U-DBCON-DEDUP commit 9656d24b14)
Only **896 / 67,178** corpus records collided by id with the 94,314 standard tools. The tell: **OSG showed 23,272** = ~11.5K from the `osg-tools.json` getter cache PLUS 11,761 from `osg-tools-extracted.json` corpus -- the two pipelines use INCOMPATIBLE synthetic id schemes (`OSG-<edp>` vs `corpus:OSG:<positional>`), so the same physical tool loads twice. Verified: osg/guhring/sandvik `*-extracted.json` are 100%-redundant data-twins of their RICHER `.ts`-getter caches (identical row count + 100% edp/part overlap + identical present-geometry; the getter additionally computes per-ISO cutting_data). **FIX: `REDUNDANT_EXTRACTED` Set in `CatalogCorpusLoaderEngine` skips the 3 twins** (richer getter copy wins), surfaced in the load result as `excludedRedundant`/`excludedRedundantDeclared` (integrity invariant `sum(perFile.read)+excludedRedundantDeclared===declaredTotal`). **Unified 160,596 -> 143,207** (exactly -17,389: osg 11,550 + guhring 3,421 + sandvik 2,418). 17/17 tests incl. an exclusion guard pinning the 3 filenames + 17,389.

**REVERTED detour:** a general natural-key dedup (mfr|designation|geometry) failed -- divergent geometry DEFAULTING between pipelines (cache -> dia*5/dia*2 for missing oal/loc; corpus -> 0) made a geometry key under-catch (5,490), and a coarse key over-merged length/flute variants (43,528). The exact file exclusion is the verified-safe fix; `ToolCatalogEngine.ts` left net-zero.

**OPEN broader follow-up (NOT done, larger unit):** `additional-tools.json` (13,257 tools from U-DBCON-CACHE-SYNC) ALSO duplicates many corpus vendors (Accupro/Flash/YG-1: e.g. `ADD-Accupro-ACCU-0.0469` == `corpus:Accupro:ACCU-0.0469`, same tool). This is a bigger additional-tools<->corpus overlap needing per-vendor identity analysis (the unique-part-number vs family-designation distinction) -- defer until scoped; risky to auto-dedup.

## 3. ESM __dir loader fix (CatalogCorpusLoaderEngine.ts)
The loader used bare `__dirname` in `resolveIndexPath`/`resolveVendorFile`. Build target is ESM (esbuild `format:"esm"`); production worked only via the esbuild banner's `var __dirname` shim -- absent under tsx, so the loader CRASHED (`ReferenceError: __dirname is not defined`) for any tsx/ts-node tooling. Fix: `const __dir = dirname(fileURLToPath(import.meta.url))` (matches 62 sibling engines). Named `__dir` NOT `__dirname` -- the banner declares `var __dirname` and a `const __dirname` would collide ("already declared").

## 4. Fleet-wide esbuild BUILD FREEZE fix (was blocking ALL dist rebuilds)
`sessionHybridSearchAction.ts` does RUNTIME cross-tree dynamic imports `import("file:///H:/prism/scripts/lib/{hybrid-retrieval,memory-index-search-lib,master-index-search-lib,episode-store}.mjs" as string)`. The `as string` cast did NOT stop esbuild resolving the literal URL -> `Could not resolve file:///...` ABORTED every `npm run build` / build:fast / build:incremental. That is why dist was frozen at Jun 9 and U-DBCON-1 (committed Jun 12) never reached the running server. Fix: `scripts/lib/esbuild-file-url-external.plugin.mjs` -- onResolve `^file://` -> `{external:true}` (leaves the import intact for runtime, the author's intent). Wired into `esbuild.config.mjs` buildOpts.plugins. 4-case behavioral test. build:fast now exits 0; dist rebuilt (U-DBCON-1 `recordArrays` + ESM `__dir` both in fresh bundle); MCP server restored via `singleton-service-guard --fix`.

## Standing recovery procedures
- If `npx tsx` against engines crashes on `__dirname` -> use `import.meta.url`, never bare `__dirname` (ESM build, banner-only shim).
- If `npm run build*` fails on `Could not resolve file:///...` -> confirm `fileUrlExternalPlugin` is still wired in `esbuild.config.mjs` (test: `node --test scripts/lib/esbuild-file-url-external.plugin.test.mjs`).
- Unified corpus re-measure: `cd mcp-server && npx tsx scripts/verify-unified-corpus-total.ts`.
- If `src/data/*-tools.json` reads ~3 bytes (empty cache) -> `node scripts/build-catalog-json.mjs --sync-src`.

Related: [[reference_fusion_per_grade_allconditions_2026_06_11]] (Option A all-conditions + U-DBCON-1 + cache-sync history).
