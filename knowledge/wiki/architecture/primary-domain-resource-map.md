---
title: Primary-Domain Resource Map — local trove (resources/ + JM DIE/) linked per manufacturing domain for easy access
galaxy: cross-cutting
owner_slot: papa
status: VERIFIED-PARTIAL
verified_by: "papa-resource-map (2026-06-10)"
verification_method: "Folder names + per-folder file counts enumerated LIVE on disk 2026-06-10 (find -type f over H:/PRISM/resources and H:/PRISM/JM DIE). Per CRITICAL-RESOURCE-ROOTS.json the pathway is root + domain-relevant subdir + each root's own index -- NOT a copy of the ~485K individual file paths. Counts are depth-1 verified-on-disk; deep enumeration lives in each root's index."
tags: [resource-map, primary-domains, local-corpus, jm-die, resources-folder, easy-access, cross-cutting, mill, lathe, wedm, cam, speed-feed, post-processor, cad, blueprint-vision]
---

# Primary-Domain Resource Map

Operator directive (2026-06-10): *"ensure all resources available for each domain that are in the resources folder, jm die folder, youtube videos and other online sources are linked to the galaxies for easy access."* This entry is the **local-trove half** — it maps each primary manufacturing domain to its real on-disk resource subdirs so a galaxy chat can jump straight to the relevant corpus. The **online/free-courses/YouTube half** lives in each galaxy's `<g>-source-atlas.md` (cross-linked per row); per-galaxy `<g>-resource-atlas.md` entries fuse both.

> **Canonical access rule** (CRITICAL-RESOURCE-ROOTS.json, owner juliett): the pathway is **root + domain subdir + the root's own index** — never enumerate the ~485K files. Roots: `H:/PRISM/resources` (167,599 files; index `RESOURCES-INDEX.md`) · `H:/PRISM/JM DIE` (317,138 files) · `H:/PRISM/Docustrata` (search `manifest.json` + `.index/`, never re-OCR). Every galaxy's `PATHS.md` already carries the marked root pointer (`scripts/wire-galaxies-to-resource-roots.mjs`).

## Per-domain local resource subdirs (verified-on-disk 2026-06-10)

### mill (foxtrot) → [[mill-source-atlas]] · [[mill-foundations]]
- `resources/HYPERMILL` (18,846) · `resources/MasterCam` (29,280) · `resources/HSMWorks 2027` (889) · `resources/FUSION360` (275) · `resources/FUSION BASIC POSTS` (180) · `resources/MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION` (272) · `resources/POSTS AND MACHINES` (3,056) · `resources/MANUFACTURER_CATALOGS` (365) · `resources/WORKHOLDING AND FIXTURE CATALOGS` (36)
- `JM DIE/CNC MILL HAAS` (533) · `JM DIE/HAAS-HURCO` (1,873) · `JM DIE/HURCO CNC PROGRAMS` (25) · `JM DIE/ROKU-ROKU` (1,108) · `JM DIE/FUSION CAD AND CAM FILES` (9,746) · `JM DIE/MATTHEW programs` (2,422)

### lathe (whiskey) → [[lathe-source-atlas]] · [[lathe-foundations]]
- `JM DIE/CNC LATHE` (134,485 — the deepest single domain corpus) · `JM DIE/OKUMA` (6,276) · `JM DIE/OKUMA MULTUS PROGRAMS` (2) · `JM DIE/CNC OKUMA MULTUS` (18) · `JM DIE/LATHE` (4)
- `resources/MULTUS PROGRAMS` (82) · `resources/OKUMA MULTUS PDFS`

### wedm (mike) → [[wedm-source-atlas]] · [[wedm-foundations]]
- `JM DIE/WIRE EDM` (4,058 — 99-customer WEDM archive)
- shared sim/post: `resources/POSTS AND MACHINES`, `resources/GENERIC MACHINE MODELS`

### cam (kilo) → [[cam-source-atlas]] · [[cam-foundations]]
- `resources/OPEN MIND` (54,100) · `resources/MasterCam` (29,280) · `resources/HYPERMILL` (18,846) · `resources/SOLIDWORKS` (14,429) · `resources/HSMWorks 2027` (889) · `resources/FUSION360` (275) · `resources/SOLIDCAM` (6) · `resources/cimco-2026` (2,036) · `resources/cimco-2025` (1,410) · `resources/fusion-addin` (7) · `resources/inventor-hsm` (1)
- `JM DIE/FUSION CAD AND CAM FILES` (9,746) · `JM DIE/QUEUE` (354)

### speed-feed (oscar) → [[speed-feed-source-atlas]] · [[speed-feed-foundations]]
- `resources/MANUFACTURER_CATALOGS` (365 tool/insert catalogs) · `resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS` (3) · `resources/TOOL_HOLDER_CAD_FILES` (25) · `resources/WORKHOLDING AND FIXTURE CATALOGS` (36)
- (cutting numerics derived here stay owner-gated in `mcp-server/src/physics/constants.ts`)

### post-processor (echo) → [[post-processor-source-atlas]] · [[post-processor-foundations]]
- `resources/FUSION POSTS` · `resources/FUSION BASIC POSTS` (180) · `resources/POSTS AND MACHINES` (3,056) · `resources/MACRO PROGRAMS` (7) · `resources/cimco-2026` (2,036) · `resources/cimco-2025` (1,410) · `resources/winmax-docs` (4)
- `JM DIE/POST PROCESSORS` (538) · `JM DIE/PRISM MODIFIED POST PROCESSORS` (18) · `JM DIE/CONTROLLERS` (9) · `JM DIE/MACRO PROGRAMS` (4)

### cad (delta) → [[cad-source-atlas]] · [[cad-foundations]]
- `resources/Freecad` (30,348) · `resources/SOLIDWORKS` (14,429) · `resources/Inventor 2027` (3,243) · `resources/DWG TrueView 2027 - English` (1,571) · `resources/FUSION360` (275) · `resources/CAD FILES` (41) · `resources/PART MODELS FOR LEARNING ENGINE` (31) · `resources/TOOL_HOLDER_CAD_FILES` (25)
- `JM DIE/FUSION CAD AND CAM FILES` (9,746) · `JM DIE/REVERSE ENGINEERING` (47)

### blueprint-vision (xray) → [[blueprint-vision-source-atlas]] · [[blueprint-vision-foundations]]
- `JM DIE/Prism JM Die` (152,960 — the customer drawing/print corpus) · `JM DIE/QUEUE` (354) · `JM DIE/PRISM CAD TESTING` (1)
- `resources/RESOURCE PDFS` (2,929) · `resources/PDF` (13)

## Shared / cross-domain local resources
- `resources/MIT COURSES` (1,106) — free courseware corpus (also cross-linked from `mit-curriculum` + `academy`)
- `resources/Virtual_Machining_Center` (343) · `resources/MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION` (272) · `resources/GENERIC MACHINE MODELS` (34) — machine-sim models (shop-floor / system-viz / sim)
- `JM DIE/TRIBAL + WIKI` (95) — JM-specific tribal/wiki seed corpus
- `JM DIE/JM DIE COMPANY` (2,252) · `JM DIE/SETUPS` (5) — shop operational records

## Keep-fresh cadence
Re-run the depth-1 enumeration (`find H:/PRISM/resources -maxdepth 1 -type d` + per-dir count, same for `JM DIE`) when a new acquisition lands; counts drift as the corpus grows. The per-galaxy `<g>-resource-atlas.md` entries (richer, with YouTube + online) are generated by `state/shared/workflows/galaxy-resource-atlas-primary.mjs`.

## Owner-gate (NOT promoted)
- Deep per-file enumeration of any subdir — lives in each root's own index, not here (per CRITICAL-RESOURCE-ROOTS.json).
- Cutting/physics numerics derivable from the speed-feed catalogs — owner-gated to oscar + `mcp-server/src/physics/constants.ts`.

## Sources
- LIVE disk enumeration 2026-06-10: `find H:/PRISM/resources -type f | wc -l` = 167,599; `find "H:/PRISM/JM DIE" -type f | wc -l` = 317,138 (depth-1 subdir counts in the per-domain tables above).
- `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` — canonical root registry (owner juliett).
- Companion online half: each `<g>-source-atlas.md` (free courses/books/videos, WebFetch-verified).
