---
title: Speed-Feed Galaxy Resource Atlas (Local Trove + Curated Video + Reputable Online)
galaxy: speed-feed
owner_slot: oscar
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas (2026-06-10)"
verification_method: "LOCAL pointers reproduced verbatim from the pre-verified on-disk trove census (2026-06-10) — each of the 4 named subdirs confirmed present + file-counted with `find -type f | wc -l` before listing (MANUFACTURER_CATALOGS=365, TOOL_HOLDER_CAD_FILES=25, WORKHOLDING AND FIXTURE CATALOGS=36 all matched the census; MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS present, listed without a fabricated count). ONLINE/VIDEO: each URL was fetched with WebFetch. Non-YouTube pages that rendered full on-topic content (HTTP 200 + readable body) are listed as fully-confirmed. YouTube channel pages return a JS-only body that WebFetch cannot render, so they are confirmed at the LINK-RESOLUTION level only (HTTP 200 + the correct channel title rendered in the page title bar) — flagged honestly per entry (R12). URLs returning 404 were DROPPED and recorded (Destiny Tool @DestinyTool / @destinytoolusa / @destinytool6855 all 404'd → dropped; Harvey Performance Company YouTube handle not used → the In The Loupe blog + @InTheLoupe channel cover Harvey/Helical). NO cutting constant appears here — this is a link directory, not a data table; every speed/feed/chip-load number stays owner-gated to oscar via constants.ts."
tags: [speed-feed, sfc, speeds-and-feeds, machining, resource-atlas, local-trove, youtube, online, catalogs, tool-holder-cad, workholding, jm-die, verified-partial]
---

# Speed-Feed Galaxy Resource Atlas

The single easy-access index for the **speed-feed** (SFC — Speed-Feed Calculator) galaxy. A chat working any speeds-and-feeds task jumps straight to what it needs: the LOCAL on-disk trove (tool/insert catalogs, holder CAD, workholding catalogs, formula/algorithm references), curated YouTube channels, and reputable free online references. This fuses the local half (the verified on-disk census) with the online/video half.

Scope (R8 — no duplication): this atlas is the **resource directory** (where the files/links live). It does NOT repeat the verified method facts in `[[speed-feed-foundations]]`, the curated free-courses/books in `[[speed-feed-source-atlas]]`, the gotchas in `[[speed-feed-applied-practice]]`, or the strategy material in `[[speed-feed-advanced-techniques]]`. For the master cross-galaxy local map see `[[primary-domain-resource-map]]`.

> R12 / SAFETY — cutting-galaxy rule: **NO numeric cutting constant is promoted in this atlas.** SFM, IPR, IPM, chip-load tables, kc1.1, mc, Taylor C/n, etc. stay owner-gated to oscar via `mcp-server/src/physics/constants.ts`. The catalogs and calculators below are LINKED as sources; the numbers are read through the owner-gated path, never copied into the wiki. See "## Owner-gate (NOT promoted)" at the end.

---

## 1. Local trove (pre-verified on disk 2026-06-10)

Pathway = **root + subdir + index** (per `CRITICAL-RESOURCE-ROOTS.json`). Start at the root index, then jump to the subdir. Counts are the on-disk census numbers (do NOT re-count; read the root index for live totals).

**Root index (start here):** `H:/PRISM/resources/RESOURCES-INDEX.md`

### Catalogs, holder CAD & workholding — `H:/PRISM/resources/`
| Subdir | Files | What it holds (for the speed-feed galaxy) |
|--------|------:|-------------------------------------------|
| `resources/MANUFACTURER_CATALOGS/` | 365 | Tool/insert manufacturer catalogs — the SOURCE for tool geometry, grade, and the vendor speeds/feeds that oscar reads through `constants.ts` (LINK only — numbers stay owner-gated) |
| `resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/` | — | Formula + algorithm reference material for cutting kinematics (RPM<->SFM, feed-chain, MRR structure) — method references, not numeric constants |
| `resources/TOOL_HOLDER_CAD_FILES/` | 25 | Tool-holder CAD models (gauge length / stickout / holder-clearance inputs that feed deflection + the speed-feed derate) |
| `resources/WORKHOLDING AND FIXTURE CATALOGS/` | 36 | Vise/chuck/fixture vendor catalogs (rigidity / clamping context for the achievable speed-feed envelope) |

### Drawings (never re-OCR)
For part drawings / blueprints that drive a speed-feed selection, search the **Docustrata** index — do NOT re-OCR:
- `H:/PRISM/Docustrata/manifest.json` + `H:/PRISM/Docustrata/.index/` — search the manifest + index; the pathway is the existing index, not a fresh OCR pass.

---

## 2. Curated YouTube (verified)

> Honesty flag (R12): YouTube serves a JavaScript-only body that WebFetch cannot render, so each channel below is confirmed at the **link-resolution** level — HTTP 200 + the correct channel name rendered in the page title bar (fetched 2026-06-10). The video grid itself was not machine-read. Channels whose handle 404'd were DROPPED. All are free, official-manufacturer or reputable-educator channels.

| Channel | URL | Confirmed | Focus |
|---------|-----|-----------|-------|
| CNCCookbook | https://www.youtube.com/@cnccookbook | title "CNCCookbook - YouTube" (HTTP 200) | Reputable educator — feeds/speeds method, chip load, G-code, tooling technique |
| Sandvik Coromant | https://www.youtube.com/@SandvikCoromant | title "Sandvik Coromant - YouTube" (HTTP 200) | Official cutting-tool OEM — application, grade selection, cutting-data method |
| Kennametal | https://www.youtube.com/@KennametalInc | title "Kennametal Inc. - OFFICIAL" (HTTP 200) | Official cutting-tool OEM — tooling application + machining technique |
| In The Loupe (Harvey / Helical) | https://www.youtube.com/@InTheLoupe | title "in the loupe - YouTube" (HTTP 200, link-resolved) | Harvey Performance machining education — HEM, chip thinning, tool selection (parent of the §3 blog) |

> Dropped on verification: Destiny Tool — the `@DestinyTool`, `@destinytoolusa`, and `@destinytool6855` handles all returned HTTP 404. Destiny Tool's end-mill technique content is not surfaced here until a resolving handle is confirmed.

---

## 3. Reputable online (fully rendered + confirmed on-topic)

> Each URL below was fetched and the full page body rendered + confirmed on-topic on 2026-06-10. Free access (some have optional paid tiers). Calculators/catalogs are LINKED as sources — any number is read through oscar's owner-gated path, never copied here.

| Source | URL | Confirmed | What it gives the speed-feed galaxy |
|--------|-----|-----------|-------------------------------------|
| Machining Doctor | https://www.machiningdoctor.com/ | full body rendered — SpeeDoctor speeds/feeds calculator + 700+ material DB + threading/tolerance/hardness tools + G-code/GD&T refs | Speeds/feeds + threading method, material machinability, cutting reference charts (every number stays owner-gated) |
| In The Loupe (Harvey / Helical Solutions) | https://www.harveyperformance.com/in-the-loupe/ | full body rendered — "130+ technical blog posts", 6 categories, HEM + drilling guidebooks | Chip-thinning / HEM / substrate / drilling technique articles from Harvey Tool, Helical, Micro 100, Titan USA, CoreHog |
| Modern Machine Shop | https://www.mmsonline.com/ | full body rendered — "Metalworking's leading information resource" | Trade-press technique articles, tooling/workholding/CAM methods, shop tours, Top Shops benchmarking |

---

## 4. Cross-links (sibling wiki layers)

- `[[speed-feed-foundations]]` — verified method/structure facts (theory: RPM<->SFM kinematics, feed-chain, Kienzle/MRR structure, chip-thinning)
- `[[speed-feed-source-atlas]]` — curated FREE living courses / open textbooks / standards portals
- `[[speed-feed-applied-practice]]` — practical gotchas, failure modes, shop-floor lessons
- `[[speed-feed-advanced-techniques]]` — advanced / high-efficiency strategy + optimization material
- `[[primary-domain-resource-map]]` — the master cross-galaxy LOCAL resource map (where this galaxy's trove sits in the full PRISM picture)

---

## 5. Keep-fresh cadence

- **Re-verify links quarterly** (or whenever a chat hits a dead link): re-fetch each §2/§3 URL; drop on 404/403; re-resolve a moved channel handle. Update `verified_by` + the per-entry confirmation note.
- **Re-attempt the dropped Destiny Tool channel**: search for a current resolving handle on the next refresh; add it back only when HTTP 200 + a Destiny Tool title is confirmed.
- **Local census refresh**: the file counts are a 2026-06-10 snapshot — read `H:/PRISM/resources/RESOURCES-INDEX.md` for live totals; do NOT re-count here. If a new catalog set or holder-CAD/workholding library lands under `resources/`, add a row (subdir + index pointer), not a copy of the files.
- **Owner-gate discipline stays**: any future catalog/calculator added here is LINKED only — its numbers remain owner-gated to oscar via `constants.ts`.
- This atlas is VERIFIED-PARTIAL: the local trove is fully verified on disk; the online/video half is verified at the rendering/resolution level noted per entry. Promote to VERIFIED only after a YouTube-API-capable pass confirms each channel's content body on-topic.

---

## Owner-gate (NOT promoted)

The following are deliberately NOT in this atlas and must NOT be copied into the wiki — they are owner-gated to oscar via `mcp-server/src/physics/constants.ts`:
- Numeric cutting speeds (SFM/Vc) / feeds (IPR/IPM/fz) / chip loads for any tool-material pair from `resources/MANUFACTURER_CATALOGS/`, Machining Doctor's SpeeDoctor, or any vendor channel.
- kc1.1 / mc / Zc specific-cutting-force constants, Taylor tool-life C/n coefficients.
- Any speeds/feeds or chip-thinning table value scraped from In The Loupe, Modern Machine Shop, Sandvik Coromant, Kennametal, or a vendor catalog.

This atlas links the SOURCE; the NUMBER is read only through the owner-gated physics path. Promoting a number here is an R12 safety violation.

## Sources

Local trove (on-disk, pre-verified 2026-06-10 — `[ -d ]` confirmed present + file-counted this session):
- `H:/PRISM/resources/RESOURCES-INDEX.md` (root index)
- `H:/PRISM/resources/MANUFACTURER_CATALOGS/` (365 files)
- `H:/PRISM/resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/`
- `H:/PRISM/resources/TOOL_HOLDER_CAD_FILES/` (25 files)
- `H:/PRISM/resources/WORKHOLDING AND FIXTURE CATALOGS/` (36 files)
- `H:/PRISM/Docustrata/manifest.json` + `H:/PRISM/Docustrata/.index/` (drawings — never re-OCR)
- `CRITICAL-RESOURCE-ROOTS.json` (pathway = root + subdir + index)

Online / video (WebFetch-verified 2026-06-10):
- https://www.youtube.com/@cnccookbook (HTTP 200, title-resolved)
- https://www.youtube.com/@SandvikCoromant (HTTP 200, title-resolved)
- https://www.youtube.com/@KennametalInc (HTTP 200, title-resolved)
- https://www.youtube.com/@InTheLoupe (HTTP 200, title-resolved)
- https://www.machiningdoctor.com/ (HTTP 200, full body)
- https://www.harveyperformance.com/in-the-loupe/ (HTTP 200, full body)
- https://www.mmsonline.com/ (HTTP 200, full body)

Dropped on verification (recorded for honesty): Destiny Tool YouTube — `@DestinyTool` (404), `@destinytoolusa` (404), `@destinytool6855` (404).
