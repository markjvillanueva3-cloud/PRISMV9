---
title: Critical Resource Roots — fleet-wide galaxy wiring
type: architecture
status: current
owner: juliett
created: 2026-05-30
commit: 0ac13e28e7
tags: [resources, jm-die, docustrata, galaxies, paths, registry, database-expansion]
---

# Critical Resource Roots — fleet-wide galaxy wiring

**Operator directive (2026-05-30):** the 3 most-important data/resource roots in PRISM must be reachable from **every** galaxy.

## The 3 roots

| Root | What | Deep index (do not re-walk) |
|---|---|---|
| `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model trove (every CAM seat + MANUFACTURER_CATALOGS + WORKHOLDING catalogs + MIT COURSES + machine-sim + macros/posts) — 47 top dirs | `RESOURCES-INDEX.md` |
| `H:/PRISM/JM DIE` | Test-shop ground truth (programs by controller, 100+ customer sets, posts, setups, TRIBAL+WIKI) — 25 top dirs | consolidated → `mcp-server/data/jm-die-database/` |
| `H:/PRISM/Docustrata` | Business/order/financial docs (quotes/orders/AR-AP/taxes/scans) — 257,992 files, 19 top dirs | `manifest.json` (66M) + `.index/*.jsonl` — **NEVER re-OCR** |

## Architecture (DRY, one source of truth)

```
CRITICAL-RESOURCE-ROOTS.json   (source of truth, juliett-owned)
  mcp-server/src/engines/database-expansion/
        │
        ▼  scripts/wire-galaxies-to-resource-roots.mjs  (idempotent generator)
        ├──► CRITICAL-RESOURCE-ROOTS.md          (human atlas, regenerated)
        └──► 34× mcp-server/src/engines/*/PATHS.md
             marked block: <!-- BEGIN:critical-resource-roots --> ... <!-- END -->
             (uniform 3-root pointer + per-galaxy domain hints)
```

**Why a registry, not copies:** the pathway is `root + its own index`. Copying 257,992 Docustrata paths into 34 galaxy files would be ~8.7M lines of immediate rot. Each root already enumerates itself (Docustrata `manifest.json`+`.index/`, resources `RESOURCES-INDEX.md`, JM DIE → `jm-die-database/`). Galaxies point to the root; consumers search the index.

## Per-galaxy domain hints

`galaxyHints` in the registry maps domain galaxies to their relevant subfolders (cam→Fusion/HSMWorks/Mastercam/SolidCAM/hyperMILL; business→Docustrata Acct/Taxes/UPS/SalesOrders; wedm→`JM DIE/WIRE EDM`; academy→MIT COURSES + Basic Training; post-processor→FUSION POSTS + JM DIE/POST PROCESSORS; blueprint-vision→Docustrata Scans/Laser). Infra/meta galaxies (wiring, fleet-hygiene, bug-hunting, …) get the uniform 3-root pointer only — **no fabricated domain line**.

## Operations

```bash
node scripts/wire-galaxies-to-resource-roots.mjs          # apply (idempotent)
node scripts/wire-galaxies-to-resource-roots.mjs --check  # CI freshness gate (exit 2 if stale)
node --test scripts/wire-galaxies-to-resource-roots.test.mjs   # 13 tests
```

Re-run after adding a galaxy or editing the registry. Idempotent: re-run = 0 changes.

## Guard note (where the registry lives + why)

The registry is a `.json` in the **owner's galaxy dir** (`src/engines/database-expansion/`), not top-level `state/shared/`:
- the cross-worktree guard blocks worktree-chat writes to top-level `state/shared/*.{json,md}`;
- `ingestion-cache-root-guard.mjs` false-fires on the word "ingest"/"scrape"/"crawl" in content but **excludes** `src/engines/`, `scripts/`, `.claude/`, `*.md/*.ts/*.mjs`.

The galaxy-dir `.json` dodges both and is semantically correct.

Memory: [[reference_critical_resource_roots_2026_05_30]] · related: [[reference_prism_reference_db_2026_05_30]].
