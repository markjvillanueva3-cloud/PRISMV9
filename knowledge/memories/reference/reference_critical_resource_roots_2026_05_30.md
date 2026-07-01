---
name: reference_critical_resource_roots_2026_05_30
description: The 3 operator-designated MOST-IMPORTANT resource roots (H:/PRISM/resources, JM DIE, Docustrata) + the canonical registry that wires ALL 34 galaxies to them. Where it lives, how to extend, the 2 write-guards that dictate its home.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.533Z
aliases: reference_critical_resource_roots_2026_05_30
---


**Critical resource roots — all galaxies wired (2026-05-30, slot:juliett, U-RESOURCE-ROOTS-WIRE, commit 0ac13e28e7).**

Operator directive: "add pathways to `H:\PRISM\resources` (all folders/files within), `H:\PRISM\JM DIE`, and `H:\PRISM\Docustrata`. make sure ALL galaxies are wired to those 3. they're 3 of the most important folders in the entire system."

**The 3 roots:**
- `H:/PRISM/resources` (47 top dirs) — CAD/CAM/training/catalog/post/machine-model trove: every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad), MANUFACTURER_CATALOGS, WORKHOLDING+FIXTURE catalogs, MIT COURSES, MACHINING KNOWLEDGE FORMULAS, machine-sim models, macros/posts. Own index: `H:/PRISM/resources/RESOURCES-INDEX.md`.
- `H:/PRISM/JM DIE` (25 top dirs) — test-shop ground truth: programs by controller (Haas/Okuma MULTUS/Hurco/lathe/Roku-Roku/WIRE EDM), 100+ customer sets under CNC LATHE, POST PROCESSORS (stock + PRISM-modified), FUSION CAD AND CAM FILES, SETUPS, TRIBAL + WIKI. Consolidated → `mcp-server/data/jm-die-database/`.
- `H:/PRISM/Docustrata` (19 top dirs, 257,992 files) — business/order/financial docs (Quotes/Sales Orders/Packing Slips/Orders Closed/Acct RecPay/TaxesIRS/UPS/Scans/Laser Sheets). **NEVER re-OCR** — search `manifest.json` (66M) + `.index/*.jsonl`. Consolidated → jm-die-database (73,506 v3 docs).

**Design (DRY, non-duplicative — the load-bearing decision):** ONE canonical registry is the source of truth → `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` (juliett-owned). An idempotent generator `scripts/wire-galaxies-to-resource-roots.mjs` (+ `.test.mjs`, 13/13) splices a MARKED `## 🌐 Critical resource roots` block into all 34 galaxy `PATHS.md` (uniform 3-root pointer + per-galaxy `galaxyHints` domain subfolders, e.g. cam→Fusion/HSMWorks/Mastercam, business→Docustrata financial, wedm→JM DIE/WIRE EDM) and regenerates the human atlas `CRITICAL-RESOURCE-ROOTS.md`. **The pathway is root+index, NOT 257K paths copied 34×** — each root carries its own deep index. Re-run after adding a galaxy / changing the registry; `--check` is a CI freshness gate (exit 2 if stale). Idempotent: re-run = 0 changes.

**Two write-guards dictated the registry's home (so it's NOT top-level state/shared):**
1. `main-tree cross-worktree guard` HARD-BLOCKS worktree-chat writes to top-level `state/shared/*.{json,md}` (regex `^state/shared/[^/]+\.(json|md)$`) — subdirs like `state/shared/specs/` are allowed.
2. `ingestion-cache-root-guard.mjs` (PostToolUse) false-positives on the word "ingest"/"scrape"/"crawl" in content, forcing it to `data/ingestion_cache/` — but it **excludes** paths under `src/engines/`, `scripts/`, `.claude/`, and `*.md/*.ts/*.mjs`. → A `.json` in a galaxy dir (`src/engines/database-expansion/`) dodges BOTH guards and is semantically correct (owner's galaxy home).

**Verification:** 34/34 galaxies wired exactly once (0 dupes), all 62 galaxyHints paths + every topLevel folder resolve to real on-disk dirs (0 fabricated), 2-reviewer scrutiny PASS (fixed P1 torn/duplicate-marker robustness in spliceSection + P1 missing `Training Videos(1).2IlEDvUm.zip` dir).

Related: [[reference_prism_reference_db_2026_05_30]] (the monolith DB extraction) · [[feedback_think_ahead_extract_adjacent_databases]] · [[feedback_enumerate_before_read]] · the xray fast-search rule (search jm-die-database/Docustrata indexes, never re-OCR).
