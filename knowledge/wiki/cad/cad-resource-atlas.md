---
title: CAD Resource Atlas
galaxy: cad
owner_slot: delta
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas (2026-06-10)"
verification_method: "Local subdirs STAT-verified on disk 2026-06-10 (8 resources + 2 JM DIE dirs present; pathway = root + subdir + index per CRITICAL-RESOURCE-ROOTS.json). Online/YouTube each WebFetch-resolved with real content; anti-bot-gated sources (403/Anubis) were DROPPED, not listed."
tags: [cad, resource-atlas, freecad, solidworks, inventor, fusion360, dwg, reverse-engineering, easy-access-index]
---

# CAD Resource Atlas

A single easy-access index for the **cad** galaxy (owner: delta). Jump straight from here to the exact trove a CAD task needs — the local on-disk corpus, the curated free YouTube channels, and the reputable official online docs. This atlas FUSES the local half (pre-verified on disk) with the online/video half (WebFetch-verified). Counts in parentheses are the on-disk file counts recorded at verification time; the pathway is always **root + subdir + that subdir's own index** (never re-scan the whole tree, never re-OCR Docustrata).

> **R12 / owner-gate:** this atlas LINKS resources only. No CAD numeric constant, tolerance default, or material/feature value is promoted here — those stay owner-gated to delta + `mcp-server/src/physics/constants.ts`. See `## Owner-gate (NOT promoted)`.

---

## Local trove (CAD / models / drawings / reverse-eng)

Root index first (read this before deep-diving any subdir): **`H:/PRISM/resources/RESOURCES-INDEX.md`** — the master local manifest for the `resources` root.

### `H:/PRISM/resources/` — CAD software corpora, sample models, tool-holder CAD

| Subdir | Files | What's there |
|--------|------:|--------------|
| `H:/PRISM/resources/Freecad/` | 30348 | FreeCAD open-source parametric modeler corpus — largest single CAD trove; install + workbench + sample assets |
| `H:/PRISM/resources/SOLIDWORKS/` | 14429 | SolidWorks corpus — parts/assemblies/drawings + reference material |
| `H:/PRISM/resources/Inventor 2027/` | 3243 | Autodesk Inventor 2027 corpus |
| `H:/PRISM/resources/DWG TrueView 2027 - English/` | 1571 | DWG TrueView 2027 (DWG/DXF viewer + reference) — note the on-disk name is `DWG TrueView 2027 - English` |
| `H:/PRISM/resources/FUSION360/` | 275 | Autodesk Fusion 360 corpus |
| `H:/PRISM/resources/CAD FILES/` | 41 | General CAD file set |
| `H:/PRISM/resources/PART MODELS FOR LEARNING ENGINE/` | 31 | Curated part models for the PRISM learning engine (feature-recognition / training) |
| `H:/PRISM/resources/TOOL_HOLDER_CAD_FILES/` | 25 | Tool-holder CAD geometry (holder/collet models) |

### `H:/PRISM/JM DIE/` — shop CAD + reverse-engineering (JM Die test shop)

| Subdir | Files | What's there |
|--------|------:|--------------|
| `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/` | 9746 | Real JM Die Fusion CAD + CAM project files — production reference geometry/jobs |
| `H:/PRISM/JM DIE/REVERSE ENGINEERING/` | 47 | Reverse-engineering scans/models (point-cloud / re-modeled parts) |

### Drawings / prints (search the index, never re-OCR)

For dimensioned drawings and scanned prints, query the **Docustrata** manifest + index instead of re-OCRing:
- `H:/PRISM/Docustrata/manifest.json` — the corpus manifest
- `H:/PRISM/Docustrata/.index/` — the prebuilt search index

Per `CRITICAL-RESOURCE-ROOTS.json`: Docustrata is one of the 3 critical resource roots — **never re-OCR it**; search `manifest.json` + `.index/`.

---

## Curated YouTube (free; each WebFetch-confirmed 2026-06-10)

Official manufacturer + reputable educator channels only. Each handle below resolved to a live channel with real content at verification time. Channels that 404'd on a tried handle were retried once and dropped if still dead.

| Channel | Handle / URL | Focus |
|---------|--------------|-------|
| Autodesk Fusion (official) | https://www.youtube.com/@adskFusion | Fusion CAD/CAM tutorials, feature deep-dives, workflows |
| Autodesk (official) | https://www.youtube.com/@autodesk | Umbrella Autodesk channel — Inventor / AutoCAD / Fusion / DWG content |
| SolidWorks (official) | https://www.youtube.com/@SolidWorks | SolidWorks modeling, assemblies, drawings, new-release features |
| Lars Christensen (CAD CAM Stuff) | https://www.youtube.com/@CADCAMStuff | Long-form Fusion 360 CAD + CAM teaching (the canonical Fusion educator) |
| UseFreeCAD | https://www.youtube.com/@FreeCADTutorials | FreeCAD tutorials — open-source parametric modeling |
| TheCADCoach | https://www.youtube.com/@TheCADCoach | General CAD instruction (SolidWorks / Fusion practical modeling) |

> Dropped on R12 (anti-bot / dead handle at verification): `@LarsLIVE`, `@FreeCAD`, `@FreeCADfoundation`, `@FreeCADChannel`, `@Inventor` (use `@autodesk` for Inventor video content).

---

## Reputable online (official docs; each WebFetch-confirmed 2026-06-10)

| Source | URL | What it is |
|--------|-----|------------|
| Autodesk Fusion Help | https://help.autodesk.com/view/fusion360/ENU/ | Official Fusion documentation — CAD/CAM/CAE/PCB unified platform; design, simulation, manufacturing |
| Autodesk Inventor 2025 Help | https://help.autodesk.com/view/INVNTOR/2025/ENU/ | Official Inventor docs — video tutorials, release notes, API/programming, install guidance (CC-BY-NC-SA) |
| FreeCAD (official site + docs hub) | https://www.freecad.org/ | Official FreeCAD homepage → documentation index, the FreeCAD manual, tutorials, Python/C++ dev docs |

> Dropped on R12 (could NOT positively confirm content — bot-gated, not fabricated): `help.solidworks.com` (HTTP 403), `my.solidworks.com/training` (HTTP 403), `wiki.freecad.org` (Anubis access-denied). These domains exist but WebFetch could not retrieve real content, so they are intentionally NOT listed as verified. A delta chat with a browser can reach them directly.

---

## Cross-links (sibling wiki layers)

- [[cad-foundations]] — CAD theory (parametric/feature-based modeling, B-rep, constraints, STEP/IGES)
- [[cad-source-atlas]] — free courses, books, open curricula for CAD
- [[cad-applied-practice]] — gotchas, failure modes, applied modeling practice
- [[primary-domain-resource-map]] — the master local resource map across all primary domains (`knowledge/wiki/architecture/primary-domain-resource-map.md`)

> `[[cad-advanced-techniques]]` does not exist yet — add the cross-link here when delta creates it.

---

## Keep-fresh cadence

- **Local trove:** re-verify subdir presence + counts whenever `RESOURCES-INDEX.md` is regenerated or a new CAD corpus lands under `resources/` or `JM DIE/`. Counts drift as files are added — treat them as "as of 2026-06-10", read the subdir index for the live number.
- **YouTube/online:** re-WebFetch every link on a ~quarterly cadence (channels rename handles, docs URLs version-bump, e.g. Inventor 2025 → 2026). Drop any that 404 / go bot-gated; promote a newly-confirmed replacement.
- **Anti-bot watchlist:** SolidWorks web help and the FreeCAD wiki were bot-gated at verification — recheck them on the next pass and promote to the verified table if a clean fetch succeeds.

---

## Owner-gate (NOT promoted)

No numeric CAD constant, tolerance default, feature-recognition threshold, or material value is promoted into this atlas. The cad galaxy's owner-gated values live with delta and `mcp-server/src/physics/constants.ts` — this file links the catalog/source so a chat reads the authoritative number at the gate, never a copy. Promoting a number here would create a drift-prone second source of truth (R12).

## Sources

- Local subdirs STAT-verified on disk 2026-06-10 via directory listing of `H:/PRISM/resources/` and `H:/PRISM/JM DIE/` (8 `resources` subdirs + 2 `JM DIE` subdirs present; `DWG TrueView 2027 - English` confirmed under its full on-disk name). Pathway + Docustrata "never re-OCR" rule per `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json`.
- Root index: `H:/PRISM/resources/RESOURCES-INDEX.md` (present).
- Drawings index: `H:/PRISM/Docustrata/manifest.json` + `H:/PRISM/Docustrata/.index/` (present).
- YouTube channels WebFetch-resolved 2026-06-10: `@adskFusion`, `@autodesk`, `@SolidWorks`, `@CADCAMStuff` (Lars Christensen), `@FreeCADTutorials` (UseFreeCAD), `@TheCADCoach`.
- Online docs WebFetch-resolved 2026-06-10: `help.autodesk.com/view/fusion360/ENU/`, `help.autodesk.com/view/INVNTOR/2025/ENU/`, `freecad.org`.
- Dropped (R12, bot-gated/dead at verification): `help.solidworks.com` (403), `my.solidworks.com/training` (403), `wiki.freecad.org` (Anubis), YouTube handles `@LarsLIVE`/`@FreeCAD`/`@FreeCADfoundation`/`@FreeCADChannel`/`@Inventor`.
