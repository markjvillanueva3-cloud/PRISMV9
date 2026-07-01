---
title: WEDM Open Source Atlas — curated living free + legal sources for wire/sinker EDM
galaxy: wedm
owner_slot: mike
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas (2026-06-10)"
verification_method: "Every URL below was WebFetched and confirmed to RESOLVE to the relevant on-topic content before listing (live link + on-topic check, not a claim extraction). URLs that 404'd, 403'd (bot-blocked), or rendered only JS-loading shells with no confirmable content were DROPPED, not listed. ISO landing/OBP pages were attempted but ISO.org bot-blocks (HTTP 403) every fetch, so NO ISO page is listed (could not verify) — ASME/OSHA/NIST stand in for the standards/authority axis. This atlas curates BROADER LIVING resources (full course homepages, textbook collections, gov data portals, lecture-video series, standards landing pages) and deliberately does NOT repeat the article-level Sources list in wedm-foundations.md."
tags: [wedm, edm, wire-edm, sinker-edm, source-atlas, free-sources, open-courseware, nptel, mit-ocw, libretexts, open-textbook, nist, doe, osti, data-gov, archive-org, asme, osha, lecture-video, living-curriculum, keep-learning]
---

# WEDM Open Source Atlas

A curated, VERIFIED directory of the best **free + legal LIVING** resources for **wire / sinker electrical-discharge machining** — the galaxy's non-stagnant "keep-learning" curriculum. Every entry points at a **continuously-updated or stable open homepage / portal / course / channel**, so the curriculum stays current by pointing at sources that maintain themselves, not at frozen snapshots.

**Distinct from [`wedm-foundations.md`](wedm-foundations.md).** The foundations file curates *specific peer-reviewed articles + gov reports + vendor explainers* whose individual claims papa confirmed. This atlas curates the *broader living containers* — the course series, textbook libraries, gov data portals, lecture-video channels, and standards bodies you return to repeatedly for fresh material. It does **not** re-list the foundations' article URLs. The flat bulk corpus at `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (not auto-invoked) is the un-curated pointer pile; this is the verified + type-organized + auto-invokable per-galaxy form.

**No physics/cutting constants here** — this is a link directory only. PRISM sources every number from `mcp-server/src/physics/constants.ts` / JM Die FA-S tables, never the web.

## Free college courses

Full free course homepages whose syllabus covers EDM / wire-EDM as a non-traditional machining process. EDM is taught inside "advanced / non-traditional / unconventional machining" courses (rarely a standalone course), so these are the right living containers.

- **NPTEL — Advanced Machining Processes (IIT Guwahati, Prof. Manas Das)** — https://nptel.ac.in/courses/112103202 — free Govt.-of-India / IIT graduate course; syllabus covers EDM, Electric Discharge Grinding, and **Wire Electric Discharge Machining (W-EDM)** principle/parameters/modelling. Re-offered periodically with refreshed runs (living course, not a frozen capture).
- **NPTEL — Advanced Machining Processes (IIT Kanpur, Prof. Shantanu Bhattacharya)** — https://nptel.ac.in/courses/112104425 — free IIT graduate course on non-conventional machining (USM/AJM/ECM/**EDM**/EBM/LBM); EDM weeks cover process parameters, mechanics, MRR estimation, spark heat-source modelling, the RC-relaxation circuit, taper/overcut, and EDM effect on surface hardness — the closest free-course treatment of the wedm process model.
- **MIT 2.810 — Manufacturing Processes and Systems (Prof. Tim Gutowski)** — https://web.mit.edu/2.810/www/ — free MIT course homepage with downloadable lecture PDFs; classifies EDM under "removal by melting/vaporization" within the full subtractive-process taxonomy, and frames process physics → quality/rate/cost — the systems-level framing a wedm planning engine sits inside.

## Free textbooks & references

Open-license textbook libraries / open textbooks whose manufacturing-process chapters carry the EDM/non-traditional-machining method content (continuously edited, not static PDFs).

- **LibreTexts — Engineering: Mechanical Engineering bookshelf** — https://eng.libretexts.org/Bookshelves/Mechanical_Engineering — free open-access curated collection of mechanical-engineering texts (mechanics, materials, manufacturing) under permissive licenses; the living open-textbook home to pull manufacturing-process method references from. Continuously expanded by the LibreTexts pilot.
- **Open Oregon — Manufacturing Processes 4-5 (LamNgeun Virasak, CC-BY-4.0)** — https://openoregon.pressbooks.pub/manufacturingprocesses45/ — free CC-licensed open textbook on machine-tool processes (mills, lathes, grinders, heat treating, CNC); the open-license shop-process reference that frames where EDM sits among conventional subtractive processes. Pressbooks-hosted, editable/versioned.

## Archives & open data / gov reports

U.S. government and public archives — the "data reports" portals. These are the canonical living gateways to fresh authoritative EDM/manufacturing technical reports, datasets, and public-domain texts.

- **NIST — Publications search (electrical discharge machining)** — https://www.nist.gov/publications/search?k=electrical+discharge+machining — live NIST.gov publication portal; the query returns 5,000+ NIST records including EDM-specific studies (recast-layer, micro-EDM single-discharge, EDM-on-Charpy). The freshness mechanism for new NIST EDM measurement science — re-run the search, don't snapshot it.
- **OSTI.gov — DOE Office of Scientific & Technical Information** — https://www.osti.gov/ — DOE's free search gateway for government-funded technical reports (incl. national-lab EDM / recast-removal / additive-post-processing work). The living portal to query for new DOE/Sandia/NNSA EDM reports.
- **OSTI — SAND2022-6018, EDM Contamination Removal from AM Components (Sandia)** — https://www.osti.gov/biblio/1871371 — a concrete free DOE/Sandia bibliographic record (brass-wire Cu-Zn recast layer + electrochemical recast removal) — kept as the worked example of what the OSTI portal surfaces for wedm surface-integrity.
- **data.gov — federal open-data catalog** — https://catalog.data.gov/dataset — the U.S. government open-data search portal (500k+ datasets across NASA/CDC/DOE/Education); the living source for any manufacturing / labor / materials dataset a wedm cost or capacity model needs.
- **Internet Archive — Texts collection** — https://archive.org/details/texts — free public-domain / borrowable digital library; the living home for out-of-copyright machining handbooks and older EDM/manufacturing texts a galaxy can mine without paywall.

## Lecture series & video

Reputable recorded lecture series. The NPTEL "Advanced Machining Processes" video series (uploaded by the official NPTEL channel) carries the EDM lectures; the individual lecture videos below were each confirmed to resolve.

- **NPTEL — Advanced Machining Processes, Mod-01 Lec-01 (IIT Kanpur, Prof. V.K. Jain)** — https://www.youtube.com/watch?v=Jg6YXvTO5FE — opening lecture of the free NPTEL Advanced Machining Processes video series; the series progresses into EDM / wire-EDM mechanism and modelling lectures (an evergreen, freely-watchable IIT lecture course).
- **NPTEL — Advanced Machining Processes, Mod-01 Lec-02** — https://www.youtube.com/watch?v=TkaCddeEZEY — second lecture of the same free series; continues the non-traditional-machining process framing the wedm process model draws on.
- **NPTEL — Advanced Machining Processes, Mod-01 Lec-19** — https://www.youtube.com/watch?v=7VCX_-Ff00w — a mid-series lecture (process-specific modelling); confirms the series runs deep enough to reach EDM-specific treatment, not just an intro.

## Standards & authoritative bodies

Standards-body and regulator landing pages relevant to wire/sinker EDM (surface-finish callouts, machine-tool safety). ISO landing/OBP pages were attempted but ISO.org bot-blocks every automated fetch (HTTP 403), so **no ISO page is listed** — it could not be verified per the honesty rule; cite ISO standards (e.g. ISO 4287 surface texture, ISO/TC 39 machine tools) by name from the ASME/NIST surfaces below until a human verifies the live ISO links.

- **ASME — Codes & Standards** — https://www.asme.org/codes-standards — the official ASME standards portal (gateway to the "Find a Standard" catalog); home of the surface-texture and dimensioning standards a wedm finish/inspection spec references (e.g. B46.1 surface texture). The living authority page, re-versioned as standards update.
- **OSHA — Machine Guarding** — https://www.osha.gov/machine-guarding — official U.S. DOL/OSHA safety topic page on machinery guarding and hazard recognition; the regulator landing page for the machine-tool-operation safety rules that bound any wedm machine setup. Continuously maintained gov safety resource.

## Maintenance

This atlas is a **link directory and is subject to link-rot** — course slugs get re-versioned (several MIT-OCW `2-008`/`2-810` dated slugs already 404'd during this verification; the stable `web.mit.edu/2.810/www/` homepage was used instead), NPTEL re-runs change `noc##` codes, and video IDs can be taken down. **The freshness mechanism is periodic re-verification:** mike (owner) should re-WebFetch every URL here on a recurring cadence (suggest quarterly, or whenever a galaxy-buildout pass touches wedm) and drop/replace any that no longer resolve, keeping `verified_by` and the date current. Prefer adding *portal/homepage/channel* URLs (which self-update) over deep-linked single documents (which rot). New living sources land first in `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-*.md`; promote the best living ones here only after a WebFetch confirms they resolve.

## Cross-refs

- Domain-knowledge spine (verified method/theory claims): [`wedm-foundations.md`](wedm-foundations.md)
- Un-curated bulk pointer pile (not auto-invoked): `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` §wedm
- Galaxy doctrine + canonical constants: [`mcp-server/src/engines/wedm/CLAUDE.md`](../../../mcp-server/src/engines/wedm/CLAUDE.md)
- Galaxy memory: [`mcp-server/src/engines/wedm/MEMORY.md`](../../../mcp-server/src/engines/wedm/MEMORY.md)
