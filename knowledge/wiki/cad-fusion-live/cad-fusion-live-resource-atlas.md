---
title: CAD-Fusion-Live Resource Atlas — one-stop easy-access index of LOCAL stores + curated YouTube/seminars + reputable free online for live parametric CAD and CAD automation/scripting
galaxy: cad-fusion-live
owner_slot: delta
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas (2026-06-10)"
verification_method: "Local store/corpus pointers STAT-verified present on disk 2026-06-10 (JM DIE/FUSION CAD AND CAM FILES + resources/FUSION360 + resources/RESOURCES-INDEX.md all present; counts reproduced verbatim from the operator directive, NOT re-counted). Every YouTube handle + online source below was WebFetched 2026-06-10 and CONFIRMED to resolve to a real live page (channel page-title resolution for YouTube; full on-topic content for docs/repos); sources that returned only template/sparse content (no confirmable on-topic body) were DROPPED, not listed (full DROP list under Keep-fresh cadence). This atlas verifies each LINK is live; it does NOT assert any technical claim/number inside those sources — numeric kernel/solver constants stay owner-gated to delta + constants.ts."
tags: [cad-fusion-live, resource-atlas, easy-access-index, fusion360, autodesk-fusion, fusion-api, freecad, cadquery, cad-automation, cad-scripting, youtube, seminars, local-trove, jm-die]
---

# CAD-Fusion-Live Resource Atlas

A single **easy-access** index for the **cad-fusion-live** galaxy (owner: delta) — *live / long-running parametric CAD sessions* and the **automation / scripting** layer that drives them. Jump straight from here to the exact resource a task needs: the **local on-disk stores/corpora**, the **curated free YouTube channels + seminars**, and the **reputable free online docs / API samples / data**. This atlas **FUSES** the local half (pre-known, verified present) with the online/video half (WebFetch-verified) and acts as the galaxy's one-stop cross-link hub — built per the operator directive that all reputable sources be linked for easy access and the atlas **not stay stagnant** (re-verify on cadence).

**Distinct from its siblings:** this is NOT the curriculum. [[cad-fusion-live-source-atlas]] owns the free-college-course / textbook / open-source-library curriculum; **this resource-atlas adds** (a) the **LOCAL trove pointers**, (b) the **video/seminar + data-report half**, and (c) the **one-stop cross-link hub**. Where the two overlap on an official-docs link, this file frames it as a *jump-to resource*, the source-atlas frames it as *keep-learning curriculum*.

> **R12 / owner-gate:** this atlas LINKS resources only. No CAD numeric constant, kernel/solver tolerance, Cpk/OEE, or safety threshold is promoted here — those stay owner-gated to delta + `mcp-server/src/physics/constants.ts`. See `## Owner-gate (NOT promoted)`.

---

## Local stores + corpora (pathway = store/corpus + its own index — never re-scan the whole tree)

The local trove is the fastest, license-free, PRISM-specific resource — read the store's **own index** first, then deep-dive. Counts in parentheses are the file counts recorded by the operator directive at verification time (treat as "as of 2026-06-10"; read the store's live index for the current number — do NOT re-count the tree).

| Store / corpus | Files | What's there | Pathway |
|----------------|------:|--------------|---------|
| `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/` | 9746 | Real JM Die **Fusion** CAD + CAM project files — production reference geometry + live-session jobs; the canonical live-Fusion corpus for this galaxy | store root + the JM DIE directory listing / Docustrata index for any dimensioned prints |
| `H:/PRISM/resources/FUSION360/` | 275 | Autodesk **Fusion 360** software corpus — install/reference material for the live-session app | `H:/PRISM/resources/RESOURCES-INDEX.md` (root manifest) → this subdir |

**Shared CAD local trove (do NOT duplicate here):** the broader CAD on-disk corpora — `resources/Freecad/`, `resources/SOLIDWORKS/`, `resources/Inventor 2027/`, `resources/DWG TrueView 2027 - English/`, `resources/CAD FILES/`, `resources/PART MODELS FOR LEARNING ENGINE/`, `resources/TOOL_HOLDER_CAD_FILES/`, and `JM DIE/REVERSE ENGINEERING/` — are indexed by the sibling galaxy. Jump to **[[cad-resource-atlas]]** for that full local trove (FreeCAD / SolidWorks / Inventor / DWG / reverse-engineering). cad-fusion-live shares that trove; the two Fusion-specific stores above are this galaxy's distinct half.

> Root index to read first: **`H:/PRISM/resources/RESOURCES-INDEX.md`** (present — the master manifest for the `resources` root). For dimensioned drawings/prints, query the **Docustrata** manifest + `.index/` — **never re-OCR** (one of the 3 critical resource roots per `CRITICAL-RESOURCE-ROOTS.json`).

---

## Curated YouTube + seminars (free; each WebFetch-confirmed 2026-06-10)

Official manufacturer + reputable educator channels for **Fusion API / parametric-automation** and live-session CAD. Each handle below resolved to a live channel page (page-title confirmed) at verification time; handles that did not resolve were retried once and dropped. (YouTube serves only the footer/title to automated fetchers — a resolving page-title is the positive signal, consistent with how [[cad-resource-atlas]] verified the same channels.)

| Channel | Handle / URL | Focus |
|---------|--------------|-------|
| Autodesk Fusion (official) | https://www.youtube.com/@adskFusion | Fusion CAD/CAM tutorials, feature deep-dives, live-session workflows — the canonical official Fusion channel |
| Autodesk Platform Services / Developer (official) | https://www.youtube.com/@autodeskplatformservices | Fusion **API / scripting / add-in** automation, Design Automation, developer webinars + recorded seminars (resolves as "Autodesk Developer") |
| Autodesk (official, umbrella) | https://www.youtube.com/@autodesk | Umbrella Autodesk channel — Fusion / Inventor / AutoCAD broadcasts, launch seminars, webinar recordings |
| Lars Christensen (CAD CAM Stuff) | https://www.youtube.com/@CADCAMStuff | Long-form **Fusion 360** CAD + CAM teaching — the canonical independent Fusion educator |
| UseFreeCAD | https://www.youtube.com/@FreeCADTutorials | FreeCAD tutorials incl. **Python macro / scripting** automation — the open-source parametric analog |

> Dropped on R12 (handle did not resolve to a confirmable channel at this pass — retry next cadence): `@LarsLIVE` (Lars's seminar/livestream handle — use `@CADCAMStuff`), `@FreeCAD`/`@FreeCADfoundation` (use `@FreeCADTutorials`).

---

## Reputable free online + data reports (each WebFetch-confirmed 2026-06-10)

The official + reputable, **free-to-read** automation references and code samples — the heart of this galaxy's "drive a live CAD session programmatically" mandate. **Fusion API samples** (the distinct resource-atlas addition over the source-atlas) come first.

| Source | URL | What it is |
|--------|-----|------------|
| **Autodesk Fusion 360 — GitHub org (official API samples)** | https://github.com/AutodeskFusion360 | Verified-by-Autodesk org: "Official GitHub account for **Fusion 360 API samples**" — ~30 public repos of runnable add-in/script samples (ParameterIO, SketchChecker, design-automation, MCP-server reference). The single highest-value automation trove for this galaxy |
| Fusion360DevTools (official sample repo) | https://github.com/AutodeskFusion360/Fusion360DevTools | MIT-licensed "collection of utilities to assist in developing Fusion 360 Add-ins" — Python command modules + `fusion360utils` lib; a copy-and-adapt scaffold for cad-fusion-live automation engines |
| Autodesk Fusion Help (official docs) | https://help.autodesk.com/view/fusion360/ENU/ | Official Fusion product-help portal — lists **Programming Interface** plus Design (Sketch/Solid/Surface/Mesh/Sheet-Metal/Assemblies) + Manufacture workspaces; the live-session reference |
| CadQuery — source repo (Apache-2.0) | https://github.com/CadQuery/cadquery | Actively-maintained open-source Python parametric-CAD-as-code lib (v2.7.0, 2026-02-13; 5.3k stars) — license-clean reference implementation of script → B-rep → STEP for the automation layer |
| FreeCAD (official site + docs hub) | https://www.freecad.org/ | Open-source parametric modeler homepage → documentation index, **Python coding documentation / Power-users hub**, downloads; the no-license-wall reference for parametric + macro automation |

> **Data-report note:** the Autodesk Fusion 360 GitHub org's per-repo metadata (stars / forks / commit recency / release dates) **is** the live "freshness/health data report" for this galaxy's automation references — e.g. CadQuery v2.7.0 dated 2026-02-13 proves the curriculum is non-stagnant. Read repo `Insights`/`Releases` for the live numbers; they are not copied here (R12 — link the report, don't snapshot the count).
>
> Dropped on R12 (resolved to template/sparse content only — could NOT confirm on-topic body, NOT fabricated): `aps.autodesk.com/developer-platform` and `aps.autodesk.com/en/docs/fusion/v1/developers_guide/overview/` (both template-gated to fetchers); `wiki.freecad.org` deep pages (Anubis access-denied — reach FreeCAD scripting docs via `freecad.org` itself). A delta chat with a browser can reach all of these directly.

---

## Cross-links (one-stop hub — sibling wiki layers + master maps)

- [[cad-fusion-live-foundations]] — galaxy theory (parametric feature history, timeline/rollback, constraint-solver states, assembly mates, associativity/digital-thread)
- [[cad-fusion-live-source-atlas]] — free college courses + textbooks + open-source-library curriculum (the keep-learning directory; this atlas points there, does not re-list it)
- [[cad-fusion-live-applied-practice]] — gotchas, failure modes, applied live-session practice
- [[cad-fusion-live-advanced-techniques]] — world-leader strategy / advanced automation technique
- [[cad-resource-atlas]] — the **shared CAD local trove** (FreeCAD / SolidWorks / Inventor / DWG / reverse-engineering) + CAD-galaxy YouTube/online
- [[primary-domain-resource-map]] — master local resource map across all primary domains (`knowledge/wiki/architecture/primary-domain-resource-map.md`)
- [[prism-methodology-foundations]] — PRISM build/verify methodology spine (`knowledge/wiki/architecture/prism-methodology-foundations.md`)

---

## Keep-fresh cadence (do NOT stay stagnant)

- **Local stores:** re-verify `JM DIE/FUSION CAD AND CAM FILES` + `resources/FUSION360` presence (and read their live index counts) whenever `RESOURCES-INDEX.md` is regenerated or a new Fusion corpus lands. Counts drift as files are added — read the store's index for the live number, never trust the "as of" figure here.
- **YouTube/seminars + online:** re-WebFetch every link on a ~quarterly cadence (channels rename handles; docs URLs version-bump; repos archive). Drop any that 404 / go template-gated; promote a freshly-confirmed replacement. The Fusion-360 GitHub org repo metadata is itself the freshness signal — if its repos go stale or archive, find the live successor.
- **Anti-bot watchlist:** Autodesk Platform Services dev pages + `wiki.freecad.org` deep pages were template/Anubis-gated to fetchers this pass — recheck and promote to the verified table if a clean fetch succeeds.
- On every pass: update `verified_by` + the date in `verification_method`, and move any newly-dead link from a table into the DROP list (never silently delete — R12).

---

## Owner-gate (NOT promoted)

No numeric CAD constant, kernel/solver tolerance, feature-recognition threshold, Cpk/OEE, material value, or safety limit is promoted into this atlas. The cad-fusion-live galaxy's owner-gated values live with **delta** and `mcp-server/src/physics/constants.ts` (per-fact domain knowledge lives in [[cad-fusion-live-foundations]]). This file links the store/source/sample so a chat reads the authoritative number at the gate — never a copy. Promoting a number here would create a drift-prone second source of truth (R12). Likewise, a live + reputable link does NOT make any technical claim inside it verified; only the link's liveness is asserted.

## Sources

Local stores STAT-verified present on disk 2026-06-10:
- `H:/PRISM/JM DIE/FUSION CAD AND CAM FILES/` (present; 9746 per operator directive)
- `H:/PRISM/resources/FUSION360/` (present; 275 per operator directive)
- `H:/PRISM/resources/RESOURCES-INDEX.md` (present — root manifest)
- Shared CAD trove + Docustrata "never re-OCR" pathway per `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json`

YouTube channels WebFetch-resolved 2026-06-10 (page-title confirmed live):
- `@adskFusion` (Autodesk Fusion), `@autodeskplatformservices` (Autodesk Developer), `@autodesk` (Autodesk umbrella), `@CADCAMStuff` (Lars Christensen), `@FreeCADTutorials` (UseFreeCAD)

Online sources WebFetch-resolved 2026-06-10 (full on-topic content confirmed):
- `github.com/AutodeskFusion360` (verified org — official Fusion 360 API samples, ~30 repos)
- `github.com/AutodeskFusion360/Fusion360DevTools` (MIT; add-in dev utilities)
- `help.autodesk.com/view/fusion360/ENU/` (official Fusion help — Programming Interface + workspaces)
- `github.com/CadQuery/cadquery` (Apache-2.0; v2.7.0 dated 2026-02-13)
- `freecad.org` (official FreeCAD site + Python docs hub)

Dropped (R12, template/sparse/access-gated at verification — not fabricated):
- `aps.autodesk.com/developer-platform`, `aps.autodesk.com/en/docs/fusion/v1/developers_guide/overview/` (template-gated to fetchers)
- `wiki.freecad.org` deep pages (Anubis access-denied)
- YouTube handles `@LarsLIVE`, `@FreeCAD`, `@FreeCADfoundation` (did not resolve to a confirmable channel)
