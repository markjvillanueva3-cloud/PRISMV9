---
title: Mill Galaxy Resource Atlas (Local Trove + Curated Video + Reputable Online)
galaxy: mill
owner_slot: foxtrot
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas (2026-06-10)"
verification_method: "LOCAL pointers reproduced verbatim from the pre-verified on-disk trove census (2026-06-10) — each subdir confirmed present with `[ -d ]` before listing; the file counts are the census numbers, NOT re-derived here. ONLINE/VIDEO: each URL was fetched with WebFetch. Non-YouTube pages that rendered full on-topic content (HTTP 200 + readable body) are listed as fully-confirmed. YouTube channel pages return a JS-only body that WebFetch cannot render, so they are confirmed at the LINK-RESOLUTION level only (HTTP 200 + the correct channel title rendered in the page title bar) — this is flagged honestly per entry (R12). URLs returning 404/403 or an unverifiable title were DROPPED (the @Helical_Solutions and @HarveyPerformanceCompany / @InTheLoupe YouTube handles 404'd → Harvey/Helical is surfaced via its live blog instead; Haas tip-of-the-day 403'd → dropped). No cutting constant appears here — this is a link directory, not a data table."
tags: [mill, milling, machining, resource-atlas, local-trove, youtube, online, cad, cam, posts, catalogs, workholding, jm-die, verified-partial]
---

# Mill Galaxy Resource Atlas

The single easy-access index for the **mill** galaxy. A chat working any mill-machining task jumps straight to what it needs: the LOCAL on-disk trove (CAD/CAM seats, posts, programs, catalogs), curated YouTube channels, and reputable free online references. This fuses the local half (the verified on-disk census) with the online/video half.

Scope (R8 — no duplication): this atlas is the **resource directory** (where the files/links live). It does NOT repeat the verified method facts in `[[mill-foundations]]`, the curated free-courses/books in `[[mill-source-atlas]]`, or the gotchas in `[[mill-applied-practice]]`. For the master cross-galaxy local map see `[[primary-domain-resource-map]]`.

> R12 / SAFETY — cutting-galaxy rule: **NO numeric cutting constant is promoted in this atlas.** Speeds, feeds, kc1.1, Taylor C/n, chip-load tables, etc. stay owner-gated to foxtrot via `mcp-server/src/physics/constants.ts`. The catalogs and calculators below are LINKED as sources; the numbers are read through the owner-gated path, never copied into the wiki. See "## Owner-gate (NOT promoted)" at the end.

---

## 1. Local trove (pre-verified on disk 2026-06-10)

Pathway = **root + subdir + index** (per `CRITICAL-RESOURCE-ROOTS.json`). Start at the root index, then jump to the subdir. Counts are the on-disk census numbers (do NOT re-count; read the root index for live totals).

**Root index (start here):** `H:/PRISM/resources/RESOURCES-INDEX.md`

### CAD / CAM seats & libraries — `H:/PRISM/resources/`
| Subdir | Files | What it holds |
|--------|------:|---------------|
| `resources/HYPERMILL/` | 18846 | hyperMILL CAM (primary JM Die mill CAM) — strategies, tool DBs, post configs |
| `resources/MasterCam/` | 29280 | Mastercam CAM — operations, post (.pst), tool/material libraries |
| `resources/HSMWorks 2027/` | 889 | HSMWorks / Fusion-HSM CAM resources |
| `resources/FUSION360/` | 275 | Fusion 360 CAD/CAM project + post assets |

### Posts, machines & catalogs — `H:/PRISM/resources/`
| Subdir | Files | What it holds |
|--------|------:|---------------|
| `resources/POSTS AND MACHINES/` | 3056 | Post-processors + machine definition files (controller/dialect source) |
| `resources/MANUFACTURER_CATALOGS/` | 365 | Tool/insert manufacturer catalogs (LINK only — numbers stay owner-gated) |
| `resources/WORKHOLDING AND FIXTURE CATALOGS/` | 36 | Vise/chuck/fixture vendor catalogs |
| `resources/MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION/` | 272 | Machine kinematic models for the learning engine + simulation |

### JM Die shop programs & live CAD/CAM — `H:/PRISM/JM DIE/`
| Subdir | Files | What it holds |
|--------|------:|---------------|
| `JM DIE/CNC MILL HAAS/` | 533 | Real Haas mill NC programs (JM Die VMC fleet) |
| `JM DIE/HAAS-HURCO/` | 1873 | Haas + Hurco mill programs |
| `JM DIE/ROKU-ROKU/` | 1108 | Roku-Roku high-speed mill programs |
| `JM DIE/FUSION CAD AND CAM FILES/` | 9746 | Live Fusion CAD + CAM project files |
| `JM DIE/MATTHEW programs/` | 2422 | Matthew's program archive (in-house mill programs) |

### Drawings (never re-OCR)
For part drawings / blueprints, search the **Docustrata** index — do NOT re-OCR:
- `H:/PRISM/Docustrata/manifest.json` + `H:/PRISM/Docustrata/.index/` — search the manifest + index; the pathway is the existing index, not a fresh OCR pass.

---

## 2. Curated YouTube (verified)

> Honesty flag (R12): YouTube serves a JavaScript-only body that WebFetch cannot render, so each channel below is confirmed at the **link-resolution** level — HTTP 200 + the correct channel name rendered in the page title bar (fetched 2026-06-10). The video grid itself was not machine-read. Channels whose handle 404'd were DROPPED. All are free, official-manufacturer or reputable-educator channels.

| Channel | URL | Confirmed | Focus |
|---------|-----|-----------|-------|
| Haas Automation | https://www.youtube.com/@HaasAutomation | title "Haas Automation, Inc. - YouTube" (HTTP 200) | Official Haas mill OEM — tip-of-the-day, control, setup |
| NYC CNC | https://www.youtube.com/@NYCCNC | title "NYC CNC - YouTube" (HTTP 200) | Reputable educator — CNC milling, Fusion CAM, shop practice |
| TITANS of CNC | https://www.youtube.com/@TITANSofCNC | title "TITANS of CNC MACHINING - YouTube" (HTTP 200) | Free machining academy — milling parts, tooling, workflow |
| CNCCookbook | https://www.youtube.com/@cnccookbook | title "CNCCookbook - YouTube" (HTTP 200) | Educator — feeds/speeds method, G-code, mill technique |

> Dropped on verification: `@Helical_Solutions` and the Harvey/`@InTheLoupe` YouTube handles returned HTTP 404 — Harvey/Helical machining education is surfaced via its live blog under §3 instead.

---

## 3. Reputable online (fully rendered + confirmed on-topic)

> Each URL below was fetched and the full page body rendered + confirmed on-topic on 2026-06-10. Free access (some have optional paid tiers). Catalogs/calculators are LINKED as sources — any number is read through foxtrot's owner-gated path, never copied here.

| Source | URL | Confirmed | What it gives the mill galaxy |
|--------|-----|-----------|-------------------------------|
| In The Loupe (Harvey / Helical Solutions) | https://www.harveyperformance.com/in-the-loupe/ | full body rendered — "130+ technical blog posts… milling and turning" | Tool-selection / substrate / HEM / drilling technique articles from Harvey Tool, Helical, Micro 100, Titan USA, CoreHog |
| Machining Doctor | https://www.machiningdoctor.com/ | full body rendered — calculators + 700-material DB + G-code/GD&T refs | Speeds/feeds + MRR + threading calculators, material machinability, reference charts (numbers stay owner-gated) |
| Modern Machine Shop | https://www.mmsonline.com/ | full body rendered — "Metalworking's leading information resource" | Trade-press technique articles, five-axis/aerospace mill methods, shop tours, Ask-the-Expert |

> Dropped on verification: Haas `tip-of-the-day.html` returned HTTP 403 (bot-blocked) — the Haas official OEM material is covered by the @HaasAutomation channel in §2 instead.

---

## 4. Cross-links (sibling wiki layers)

- `[[mill-foundations]]` — verified method/structure facts (theory: Kienzle structure, MRR, chip-thinning, SPC method)
- `[[mill-source-atlas]]` — curated FREE living courses / open textbooks / gov-data / standards portals
- `[[mill-applied-practice]]` — practical gotchas, failure modes, shop-floor lessons
- `[[mill-advanced-techniques]]` — advanced / high-efficiency strategy material
- `[[primary-domain-resource-map]]` — the master cross-galaxy LOCAL resource map (where this galaxy's trove sits in the full PRISM picture)

---

## 5. Keep-fresh cadence

- **Re-verify links quarterly** (or whenever a chat hits a dead link): re-fetch each §2/§3 URL; drop on 404/403; re-resolve a moved channel handle. Update `verified_by` + the per-entry confirmation note.
- **Local census refresh**: the file counts are a 2026-06-10 snapshot — read `H:/PRISM/resources/RESOURCES-INDEX.md` for live totals; do NOT re-count here. If a new mill CAM seat or program archive lands under `resources/` or `JM DIE/`, add a row (subdir + index pointer), not a copy of the files.
- **Owner-gate discipline stays**: any future catalog/calculator added here is LINKED only — its numbers remain owner-gated to foxtrot via `constants.ts`.
- This atlas is VERIFIED-PARTIAL: the local trove is fully verified on disk; the online/video half is verified at the rendering/resolution level noted per entry. Promote to VERIFIED only after a YouTube-API-capable pass confirms each channel's content body on-topic.

---

## Owner-gate (NOT promoted)

The following are deliberately NOT in this atlas and must NOT be copied into the wiki — they are owner-gated to foxtrot via `mcp-server/src/physics/constants.ts`:
- Numeric cutting speeds / feeds / chip loads for any tool-material pair from `resources/MANUFACTURER_CATALOGS/` or Machining Doctor.
- kc1.1 / mc / Zc specific-cutting-force constants, Taylor tool-life C/n coefficients.
- Any speeds/feeds table value scraped from In The Loupe, Modern Machine Shop, or a vendor catalog.

This atlas links the SOURCE; the NUMBER is read only through the owner-gated physics path. Promoting a number here is an R12 safety violation.

## Sources

Local trove (on-disk, pre-verified 2026-06-10 — `[ -d ]` confirmed present this session):
- `H:/PRISM/resources/RESOURCES-INDEX.md` (root index)
- `H:/PRISM/resources/{HYPERMILL, MasterCam, HSMWorks 2027, FUSION360, POSTS AND MACHINES, MANUFACTURER_CATALOGS, WORKHOLDING AND FIXTURE CATALOGS, MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION}/`
- `H:/PRISM/JM DIE/{CNC MILL HAAS, HAAS-HURCO, ROKU-ROKU, FUSION CAD AND CAM FILES, MATTHEW programs}/`
- `H:/PRISM/Docustrata/manifest.json` + `H:/PRISM/Docustrata/.index/` (drawings — never re-OCR)
- `CRITICAL-RESOURCE-ROOTS.json` (pathway = root + subdir + index)

Online / video (WebFetch-verified 2026-06-10):
- https://www.youtube.com/@HaasAutomation (HTTP 200, title-resolved)
- https://www.youtube.com/@NYCCNC (HTTP 200, title-resolved)
- https://www.youtube.com/@TITANSofCNC (HTTP 200, title-resolved)
- https://www.youtube.com/@cnccookbook (HTTP 200, title-resolved)
- https://www.harveyperformance.com/in-the-loupe/ (HTTP 200, full body)
- https://www.machiningdoctor.com/ (HTTP 200, full body)
- https://www.mmsonline.com/ (HTTP 200, full body)

Dropped on verification (recorded for honesty): `@Helical_Solutions` (404), `@HarveyPerformanceCompany`/`@InTheLoupe` YouTube (404), `haascnc.com/.../tip-of-the-day.html` (403).
