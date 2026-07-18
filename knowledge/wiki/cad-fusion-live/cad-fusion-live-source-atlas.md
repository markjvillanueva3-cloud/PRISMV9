---
title: CAD-Fusion-Live Open-Source Atlas — curated living free + legal resources for live parametric CAD, the long-running modeling session, and CAD automation / scripting
galaxy: cad-fusion-live
owner_slot: delta
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: "Every URL below was WebFetched and CONFIRMED to resolve to live, on-topic content (official product-help portal / free course homepage / open-source library docs / open-source repo) before listing on 2026-06-10. URLs that returned 403/404/503, were Anubis-access-denied, or returned content too sparse to confirm on-topic were DROPPED and not listed (full DROP list under Keep-fresh cadence). This atlas verifies that each LINK is live + on-topic; it does NOT assert the technical claims inside those sources (numeric kernel tolerances, per-product UI behavior, mate->DOF tables stay owner-gated to delta in cad-fusion-live-foundations.md). Core solid-modeling MATH (B-rep/NURBS/CSG/GD&T/STEP) is intentionally NOT re-listed here — it is owned by knowledge/wiki/cad/cad-source-atlas.md, which this atlas points to."
tags: [cad-fusion-live, source-atlas, free-courseware, living-resources, autodesk-fusion, autodesk-inventor, freecad, cadquery, build123d, cad-automation, cad-scripting, parametric-cad, cad-as-code, mit-ocw, official-docs]
---

# CAD-Fusion-Live Open-Source Atlas

A curated, **verified** directory of the best FREE + LEGAL **living** resources for the **cad-fusion-live** domain: *live / long-running parametric CAD sessions* and the **automation / scripting layer** that drives them. Chosen so the galaxy has a non-stagnant "keep-learning" curriculum that stays current because it points to **continuously-updated** sources (official product-help portals, free course homepages, actively-maintained open-source library docs) rather than a frozen snapshot.

**This galaxy is the live-session / automation sibling of the `cad` galaxy.** Where `cad` owns the static geometry math, cad-fusion-live owns the *session, history, constraint-solve, and programmatic-driving* dimension. Accordingly:

- **Core CAD theory is NOT duplicated here.** B-rep topology, NURBS, CSG booleans, GD&T, STEP/PMI standards, and the geometry-processing courses (MIT 2.158J as a *math* spine, NPTEL CAD, NIST MBE/PMI data, ASME Y14.5/Y14.41, Open CASCADE kernel) live in **[`knowledge/wiki/cad/cad-source-atlas.md`](../cad/cad-source-atlas.md)** — read that for the theory keep-learning directory. This atlas POINTS there and does not re-list those entries.
- **Per-fact domain knowledge** (parametric feature history, the timeline/rollback model, constraint-solver states, assembly mates, associativity/digital-thread) lives in the sibling **[`cad-fusion-live-foundations.md`](cad-fusion-live-foundations.md)** — this atlas does not repeat its Sources list.

What this atlas adds: the **live-application + automation** living curriculum — Autodesk Fusion/Inventor official learning, free open-source parametric-CAD apps + their scripting docs, the "CAD-as-code" Python libraries, and the free university design courses that teach the *workflow*.

> **R12 honesty boundary:** every entry below was fetched and confirmed live + on-topic on 2026-06-10. A live, reputable link does NOT make any number inside it verified — numeric kernel/solver constants and per-product behavior stay owner-gated to delta (see `cad-fusion-live-foundations.md` Owner-gate).

---

## 1. Official product docs (the live-session apps)

The authoritative, continuously-versioned help portals for the commercial CAD apps PRISM's live-session layer interoperates with. Free to read (the software is licensed; the documentation is open).

- **Autodesk Fusion Help** — https://help.autodesk.com/view/fusion360/ENU/ — the official Fusion product-help portal (c 2025). Covers the full live-session surface: Sketch / Solid / Surface / Mesh / Form / Sheet-Metal design, Assemblies, the Manufacture (CAM) workspace, Simulation, and the Programming Interface. **Feeds:** the galaxy's understanding of timeline/feature-tree UI behavior, parametric edit-in-place, and the workspace model a long-running Fusion session lives in.
- **Autodesk Inventor 2025 Help** — https://help.autodesk.com/view/INVNTOR/2025/ENU/ — the official Inventor product-help portal. Covers parametric part modeling (Create Sketches / Create Parts), Assembly Basics, and explicitly lists **iLogic, the iLogic API, and the Programming Interface** as help categories. **Feeds:** the parametric-assembly and rules-driven-automation (iLogic) side of the galaxy — Inventor is the desktop-parametric analog to Fusion's cloud model.

## 2. CAD automation & scripting (the programmatic-driving layer)

The API/scripting references that turn a live CAD session into a *programmable* one — the heart of this galaxy's "automation layer" mandate.

- **Autodesk Fusion API Reference Manual** — https://help.autodesk.com/view/fusion360/ENU/?guid=GUID-7B5A90C8-E94C-48DA-B16B-430729B734DC — the landing page of Fusion's API reference: the alphabetical Objects listing (methods / properties / events), sample programs, and multi-language code examples for writing Fusion scripts and add-ins. **Feeds:** any cad-fusion-live engine that drives Fusion programmatically (script-generated geometry, headless parameter edits, add-in-style automation).
- **FreeCAD (official site + docs hub)** — https://www.freecad.org/ — the home of FreeCAD, the open-source ("no licensing fees, no vendor lock-in") parametric 3D modeler. The Documentation menu links the user manual, the **Python coding documentation / Power-users hub**, and the general docs index. **Feeds:** a fully-free, inspectable reference for parametric modeling + Python macro automation — the open-source app whose internals delta can read without a license wall. (Note: the `wiki.freecad.org` deep pages are Anubis-access-gated to automated fetchers; reach the scripting docs via the links on `freecad.org` itself.)
- **CadQuery — documentation** — https://cadquery.readthedocs.io/en/latest/ — official docs for CadQuery, "an intuitive, easy-to-use Python library for building parametric 3D CAD models." Teaches workplane-based modeling, topological selectors, constraint-based assemblies, and STEP/STL/AMF/3MF export — treating "CAD models as source code." **Feeds:** the "CAD-as-code" pattern PRISM uses for generated/parametric geometry; the closest free analog to scripting a live parametric session in plain Python.
- **CadQuery — source repository (GitHub)** — https://github.com/CadQuery/cadquery — the Apache-2.0 open-source repo (actively maintained; release v2.7.0 dated 2026-02-13, proving freshness). **Feeds:** a readable reference implementation of parametric-script -> B-rep -> STEP for the automation layer; license-clean to study.
- **build123d — documentation** — https://build123d.readthedocs.io/en/latest/ — official docs for build123d, "a Python-based, parametric (BREP) modeling framework" built on the Open CASCADE kernel, with explicit 1D/2D/3D geometry classes and operator-driven ("CAD-as-code") composition; exports to FreeCAD / SolidWorks for CNC/3D-print/laser. **Feeds:** a second, more-Pythonic open-source automation reference — pairs with CadQuery as the free programmatic-CAD curriculum.

## 3. Free college courses (the workflow & design-process spine)

Open-courseware course homepages — each carries a complete syllabus and (CC-licensed) lecture material, continuously hosted by the institution. These teach the *design workflow* a live session serves, not the static geometry math (that is in cad-source-atlas).

- **MIT OpenCourseWare — 2.158J Computational Geometry** — https://ocw.mit.edu/courses/2-158j-computational-geometry-spring-2003/ — Patrikalakis & Maekawa graduate course; the strongest free analog for *why* a parametric session behaves as it does (B-splines/NURBS, sweeps, offsets/blending/filleting, CSG + boundary representation, **non-linear solvers and intersection problems**, feature representation/recognition). **Feeds:** the constraint-solver + re-evaluable-tree intuition behind the live timeline. (Shared with cad-source-atlas where it anchors the *math*; surfaced here in its *session-behavior* capacity.)
- **MIT OpenCourseWare — 2.007 Design and Manufacturing I** — https://ocw.mit.edu/courses/2-007-design-and-manufacturing-i-spring-2009/ — MIT's first engineering-design subject (CC-licensed, freely shared), built around a design-and-build project. **Feeds:** the design-intent / iterative-design-process framing — the *why* behind capturing design intent in a parametric model, which the foundations file treats as a core principle.

---

## Keep-fresh cadence

This atlas is a **link directory**, so its single failure mode is **link-rot** — a product-help GUID gets re-issued, a course is re-homed, a library moves its docs host. The freshness mechanism is therefore **periodic re-verification**: re-WebFetch every URL on a recurring cadence (suggested: quarterly, or whenever a cad-fusion-live chat touches this file) and DROP any entry that no longer resolves or has gone off-topic, replacing it with a fresh verified equivalent. Update `verified_by` and the date in `verification_method` on each pass. Because every listed source is itself *continuously updated* (Autodesk versions its help yearly; FreeCAD/CadQuery/build123d ship releases regularly — CadQuery v2.7.0 was dated 2026-02-13 at this pass; MIT OCW pages are stable CC archives), the curriculum stays current as long as the links stay live — re-verification is the only upkeep this atlas needs.

**Candidate links DROPPED during the 2026-06-10 verification pass (did not resolve / access-blocked / too sparse to confirm — do NOT re-add without a fresh confirming fetch):**
- `autodesk.com/products/fusion-360/learn-training-tutorials` (HTTP 403) and `autodesk.com/learn/ondemand/curated/learn-autodesk-fusion` (HTTP 403) — Autodesk marketing/learn pages block automated fetch; the official **Fusion Help** + **API Reference** portals above carry the equivalent learning content and DID resolve.
- One Autodesk Fusion API GUID URL (HTTP 503) — replaced by the confirmed API Reference Manual GUID listed in section 2.
- `wiki.freecad.org/Manual:Introduction` and `wiki.freecad.org/Power_users_hub` (Anubis "Access Denied" to fetchers, both attempts) — FreeCAD scripting/manual content is reached via the confirmed `freecad.org` site entry instead.
- `freecad.github.io/freecad-docs/` (HTTP 404) — no live mirror at that path this pass.
- `learn.onshape.com/` (JS-rendered, only page title returned) and `learn.onshape.com/learn/learning-pathways` (HTTP 404) — Onshape's free learning center could not be confirmed on-topic by fetch; left out per R12 rather than guessed.
- `aps.autodesk.com/developer/overview/fusion-360-api` (HTTP 404) and `aps.autodesk.com/en/docs/fusion/v1/overview/` (content too sparse to confirm) — Autodesk Platform Services Fusion-API entry not confirmable; the in-product **Fusion API Reference Manual** above covers the same automation surface.

---

## Sources

WebFetch-confirmed live + on-topic this pass (distinct URLs):

1. [Autodesk Fusion Help](https://help.autodesk.com/view/fusion360/ENU/) — official product-help portal
2. [Autodesk Inventor 2025 Help](https://help.autodesk.com/view/INVNTOR/2025/ENU/) — official product-help portal
3. [Autodesk Fusion API Reference Manual](https://help.autodesk.com/view/fusion360/ENU/?guid=GUID-7B5A90C8-E94C-48DA-B16B-430729B734DC) — official API/automation docs
4. [FreeCAD (official site + docs hub)](https://www.freecad.org/) — open-source parametric CAD + Python scripting docs
5. [CadQuery — documentation](https://cadquery.readthedocs.io/en/latest/) — open-source Python parametric CAD-as-code
6. [CadQuery — source repository (GitHub, Apache-2.0)](https://github.com/CadQuery/cadquery) — actively-maintained reference implementation
7. [build123d — documentation](https://build123d.readthedocs.io/en/latest/) — open-source Python BREP modeling framework
8. [MIT OCW 2.158J Computational Geometry](https://ocw.mit.edu/courses/2-158j-computational-geometry-spring-2003/) — free college course
9. [MIT OCW 2.007 Design and Manufacturing I](https://ocw.mit.edu/courses/2-007-design-and-manufacturing-i-spring-2009/) — free college course

## Cross-refs

- **Core CAD theory keep-learning directory (do NOT duplicate here):** [`knowledge/wiki/cad/cad-source-atlas.md`](../cad/cad-source-atlas.md) — owns the B-rep/NURBS/CSG/GD&T/STEP + geometry-processing-course + NIST-data + ASME-standards living sources.
- **This galaxy's per-fact domain spine:** [`cad-fusion-live-foundations.md`](cad-fusion-live-foundations.md) — parametric feature history, timeline/rollback, constraint-solver states, assembly mates, associativity/digital-thread.
- Galaxy doctrine: `mcp-server/src/engines/cad-fusion-live/CLAUDE.md`
- Galaxy memory: `mcp-server/src/engines/cad-fusion-live/MEMORY.md`
