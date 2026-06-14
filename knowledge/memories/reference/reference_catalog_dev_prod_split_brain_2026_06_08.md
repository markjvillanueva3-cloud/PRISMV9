---
name: reference_catalog_dev_prod_split_brain_2026_06_08
description: "Tool-catalog JSONs in src/data are runtime-cache STUBS; full data lives in .ts sources + built dist/data. Dev/vitest reads stubs, prod reads full — a deliberate split, not a bug. U-GCNC01 fixed the global-cnc loader; bulk-syncing all catalogs to src is WRONG (1.1M-line build-artifact bloat)."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.051Z
aliases: reference_catalog_dev_prod_split_brain_2026_06_08
---


# Tool-catalog dev/prod split-brain (verified 2026-06-08, slot:juliett)

## The architecture (build-catalog-json.mjs:9 — "JSON files are the runtime cache")
- **Canonical source** = the big `src/data/<vendor>-tool-catalog.ts` files (`EMUGE_TOOLS` 13.7K, `SANDVIK_2018_ROTATING_TOOLS` 10.7K, `KENNAMETAL_TURNING_TOOLS` 5.8K, `GLOBAL_CNC_TOOLS` 3.7K, additional 13.3K, indexable 11.5K, osg 11.6K, helical 6K, sumitomo 7.6K, sandvik 2.4K, guhring 3.4K — ~85K records total).
- **Runtime cache** = `<vendor>-tools.json`. `scripts/build-catalog-json.mjs` (postbuild, esbuild-evaluates each `.ts`) writes them to **`dist/data/`** only.
- **The tracked `src/data/<vendor>-tools.json` are deliberately tiny STUBS** (8–15 seed records, e.g. romeo's `U-GUHR01`/`U-OSG01`) or `[]`.

## The split-brain consequence
`catalogLoader.dataDir()` resolves `__dirname/data`:
- **Production** (`__dirname`=`dist/`) → reads `dist/data/<vendor>-tools.json` = FULL ~85K records.
- **Dev / vitest** (no `dist/`, `__dirname`=`src/data/`) → reads the `src/data/` STUBS = ~100 records.

So the catalog has ~85K tools in prod but ~100 in dev. Tests that pass against stubs don't exercise the real corpus. **This is by design, not an accidental empty file** — but it's a real coverage gap for dev/CI.

## What U-GCNC01 fixed (commit a9a50f46d5) — the CORRECT scope
The genuine bug in `ToolCatalogEngine._loadGlobalCNCTools()`: it loaded ALL records incl. 2,416 guide bushings + bad-geometry rows (1016mm=40" bore extraction errors, zero-OAL) as if they were cutting tools. Fix = **filter at the loader** (source-agnostic, the single chokepoint both src-stub and dist-full flow through): drop bushings + implausible bore + zero OAL; map the 9 holder families to end_mill/boring_bar/turning_tool; bore→cutting_diameter only for boring_bar. LIVE: 1,134 holders, 0 bushings. Also mirrored `global-cnc-tools.json` to its canonical source so dev==prod for that one catalog.

## What is the WRONG fix (rejected this session)
Adding `--sync-src` to `build-catalog-json.mjs` and bulk-mirroring ALL catalogs into tracked `src/data/` → **+1,127,785 insertions** of build-artifact JSON. Bloats the repo for data that is regenerable from the `.ts` on every build. Reverted.

## The proper fix = an architectural decision for the operator (NOT yet done)
To make dev/vitest see the full corpus without committing build artifacts, options:
1. `catalogLoader.dataDir()` prefers built `dist/data/` over `src/data/` stubs when present (needs build-before-test).
2. A vitest global-setup that runs `build-catalog-json.mjs` first.
3. Accept the split (dev = fast small fixtures; prod = full) and document it as intended.
Pick one with the operator. Until then, dev catalog coverage stays at stub size.

## Latent hazard found (out of scope, flag only)
`scripts/build-catalog-json.mjs` is **wired into `postbuild` (package.json:23) but UNTRACKED in git** (`??`, never `git add`-ed, not gitignored). The build depends on an uncommitted file — a fresh clone's `postbuild` would skip catalog generation. Owner: build/infra (papa?).

Related: [[feedback_wire_test_validate_all_galaxies]] (validate on LIVE data — this is why the dev-stub gap matters), [[reference_cam_tool_data_contract_2026_06_01]] (the consumer side of these catalogs).
