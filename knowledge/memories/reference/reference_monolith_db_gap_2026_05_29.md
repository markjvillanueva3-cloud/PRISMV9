---
name: reference_monolith_db_gap_2026_05_29
description: "Monolith (PRISM_v8_89 HTML) + extracted_modules un-ported DB troves — ~945 orphaned .js, materials registry misconfigured (944 unreachable), Taylor/Johnson-Cook/chatter/post gaps routed to juliett/oscar/echo."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.222Z
aliases: reference_monolith_db_gap_2026_05_29
---


# Monolith un-extracted DB gaps (foxtrot DB-completeness sweep, 2026-05-29)

The operator was right: there is much DB content still unaccounted-for. A monolith-sweep
agent (COMPLETED) inventoried the legacy build + the extracted-modules tree against the
live MCP registries. Findings, with domain-owner routing.

**Sources:**
- Monolith: `C:/PRISM/_BUILD/PRISM_v8_89_002_TRUE_100_PERCENT.html` (986,622 lines — the pre-modular monolith; large files mixing many data kinds, exactly as the operator described).
- Extracted: `H:/prism/extracted/` (896 files) + `H:/prism/extracted_modules/` (**957 orphaned `.js`, ~945 UNPORTED — only ~8-12% wired into the live MCP server**).

## TOP GAPS → route to domain owners

| Trove | What | Owner | Unit |
|-------|------|-------|------|
| **MATERIALS registry misconfig** | `PATHS.MATERIALS_DB` points at near-empty `mcp-server/src/data/materials/`; real corpus at `H:/prism/extracted/materials_v9_complete/` → **944 of 1,047 materials unreachable**. 1-line PATHS repoint. **Highest ROI.** | **juliett** | U-MONO-MAT-REPOINT |
| `PRISM_TAYLOR_COMPLETE.js` (2.08 MB, ULTRA) | 150 SFM/IPT combos, extended Taylor `V·T^n·f^a·d^b` | **oscar** | blocks HSMAdvisor/G-Wizard parity |
| `PRISM_JOHNSON_COOK_DATABASE.js` | 62 alloys vs current ~5 (**+57**) | **oscar** | — |
| `PRISM_CHATTER_PREDICTION_ENGINE.js` | semi-discretization (Insperger–Stépán DDE) vs current Altintas-analytic-only | **oscar** | (cross-ref [[reference_chatter_engine_regression_2026_05_24]] — live SLD returns 0 lobes) |
| `PRISM_VERIFIED_POST_DATABASE_V2.js` (5.5 MB, 700+ post configs) + `PRISM_POST_PROCESSOR_GENERATOR.js` (6.4 MB) | post-processor configs + generator | **echo** | Master Post revenue product |
| `PRISM_EXTENDED_MATERIAL_CUTTING_DB.js` | 107 grades | **juliett** | — |
| `PRISM_FIXTURE_DATABASE.js` | supplementary fixtures | **juliett** | workholding loader already absorbed 2026-05-26 |

## How to apply
Domain owners verify each trove against their live registry BEFORE porting (file presence ≠
correctness; the monolith mixed verified + speculative data). Port via the canonical
registry path, never inline kc/Taylor/JC constants (import from `physics/constants.ts`).
Material lookups route through `MaterialRegistry`. Use lima's pypdf extractor for any PDF
source [[feedback_use_lima_pypdf_page_extractor]]. Sweep the WHOLE tree, fan out parallel
agents [[feedback_full_recursive_parallel_search]].

## H-drive trove sweep (first-hand, confirms the above + 3 NEW data files)
A direct bounded SQLite + large-data-file sweep of the H: trove dirs found the monolith
corpus mirrored in **`H:/_ORPHAN-PRISM-MCP-SERVER-archived-20260421`** — a snapshot of the
pre-modular MCP server with its own `extracted_modules/` (**1,042 .js**, tiers
GIANT/ULTRA/COMPLETE/FINAL/MEGA + extraction-manifest JSONs). Confirms the orphaned-module
finding from a second physical source. NEW concrete data beyond the monolith list:
- `data/tools/CUTTING_TOOLS_INDEX.json` (5.74 MB) → foxtrot/juliett (cutting-tool index)
- `extracted_modules/ULTRA/PRISM_CUTTING_TOOL_EXPANSION_V3.js` (2.58 MB) → foxtrot/juliett
- `extracted_modules/ULTRA/PRISM_MANUFACTURER_CATALOG_DB.js` (2.31 MB) → juliett/oscar (vendor SF tables)

`found.000-004`, `cad-engine`, `data`, `blobs`, `prism-cad-complete` → no trove matched.

**GAP CLOSED 2026-05-30 ([[feedback_always_fill_gaps]]):** `prism-backups` is git history-rewrite
backups, NOT data (the 200K "files" were git objects in `dotgit-pre-rewrite-*` stores → the
60 s timeout). Pruned re-scan: zero `.db`/material/tool troves outside the git stores; the only
data (`backup-untracked/.../mcp-server/data/`) is byte-identical-or-older vs the live repo (no
loss). `prism_data.db` inspected via better-sqlite3: `materials:10 · machines:8 · alarms:5` rows
— a 28 KB legacy seed, superseded by the live 1,047-material registry. All H-drive gaps closed.

Cross-ref: [[reference_monolith_extraction]] · [[reference_oscar_sfc_monolith_absorb_plan_2026_05_29]] · [[reference_u_db_monolith_unified_query_2026_05_27]] · [[reference_machining_resources_materials_census_2026_05_29]] · [[feedback_never_delete_only_disable]] · [[feedback_full_recursive_parallel_search]].
