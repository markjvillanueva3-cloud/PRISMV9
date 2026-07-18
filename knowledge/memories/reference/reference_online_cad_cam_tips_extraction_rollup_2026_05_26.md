---
name: online-cad-cam-tips-extraction-rollup-2026-05-26
description: "Rollup of /goal session (slot:delta /loop iters 1-4) — 12 reputable free CAD/CAM tips PDFs acquired + extracted via lima's pypdf method + embedded into tribal-embed-index; 1,107 new tribal pages live across 7 software families + general CNC; index grew 21,825→22,932 (+5.1%)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.684Z
aliases: reference_online_cad_cam_tips_extraction_rollup_2026_05_26
---


# Online CAD/CAM tips extraction — /goal session rollup (slot:delta /loop iters 1-4)

User directive: *"keep extracting wiki + tribal knowledge for cad know how injection within cad domain node | use lima's method for pdf extraction on H:\PRISM\JM DIE\TRIBAL + WIKI pdfs pertaining to cad cam software, look for reputable sources online for more cad tips and tricks for each cad software"*.

## End-to-end LIVE outcome

**Index grew 21,825 → 22,932 entries (+1,107, +5.1%)** across 4 /loop iters.

| Iter | Commit | Surface | Live impact |
|---|---|---|---|
| 1 | _(memory only)_ | Catalog of 16 reputable free PDFs across 5 software families | Identified Mastercam encrypted-PDF gap (R12 fail-loud) |
| 2 | `[delta]` (post-iter 4 review) | New `scripts/extract-online-cad-tips.py` (pypdf method, lima-parity) | 3 PDFs / 138 entries / +138 in index |
| 3 | _(same script)_ | 4 PDFs HTTP-acquired (CATIA + NX + PowerMill) | +511 in index |
| 4 | _(same script)_ | 5 PDFs (Titans + Urban Workshop + 3 OpenMind brochures) | +458 in index |

## Acquired corpus (`H:/PRISM/JM DIE/TRIBAL + WIKI/online-acquired/`)

| Software | PDF | Size | Pages | Emitted | Domain |
|---|---|---|---|---|---|
| **CATIA** | CATIA-V5-Fundamentals-EDU-CAT.pdf | 11.3 MB | 338 | 117 | cad |
| **CATIA** | CATIA-V5-Mechanical-Design-Expert.pdf | 16.9 MB | 294 | 145 | cad |
| **Fusion 360** | AU-Fusion-360-101-Tips-Scott-Moyse.pdf | 5.5 MB | 53 | 51 | cam |
| **hyperMILL** | openmind-production-machining.pdf | 2.5 MB | 12 | 11 | cam |
| **hyperMILL** | openmind-hypermill-overview-2d-3d-5axis.pdf | 3.8 MB | 8 | 6 | cam |
| **hyperMILL** | openmind-turbine-blade-5axis.pdf | 804 KB | 4 | 3 | cam |
| **hyperMILL** | openmind-tube-5axis.pdf | 934 KB | 4 | 3 | cam |
| **Inventor** | AU-Inventor-Beginner-Leo-Warren.pdf | 10.4 MB | 102 | 76 | cad |
| **PowerMill** | Autodesk-PowerMill-MTD-User-Guide.pdf | 3.0 MB | 78 | 53 | cam |
| **Siemens NX** | NX-12-Engineering-Design-Leu-Tao-Ghazanfar.pdf | 9.9 MB | 225 | 196 | cad |
| **General CNC** | titans-of-cnc-fundamentals.pdf | 14.4 MB | 256 | 215 | general |
| **General CNC** | urban-workshop-cnc-milling-manual-davis.pdf | 12.1 MB | 256 | 215 | general |
| **TOTAL** | **12 PDFs** | **91 MB** | **1,630** | **1,107** | |

## Cumulative coverage (local TRIBAL+WIKI + new online)

| Software | Online (this session) | Local (lima prior) | Cumulative |
|---|---|---|---|
| Mastercam | 0 (encrypted gap) | 0 (both PDFs encrypted) | **0 — open gap** |
| SolidWorks | 0 (Dassault + SDC 403) | 492 (Planchard) | 492 |
| Fusion 360 | 51 | 247 | 298 |
| Inventor | 76 | 1,249 (InventorCAM 2024) | 1,325 |
| hyperMILL | 23 | 1,076 (Manual + 2D/3D) | 1,099 |
| CATIA | **262 NEW** | 0 | **262** |
| Siemens NX | **196 NEW** | 0 | **196** |
| PowerMill | **53 NEW** | 0 | **53** |
| General CNC | **430 NEW** | 0 | **430** |

## Mastercam gap (encrypted-PDF block)

Both Mastercam PDFs in TRIBAL+WIKI return `pypdf.is_encrypted == True`:
- `Getting Started with Mastercam Solids.pdf` (7.3 MB)
- `Mastercam-Wire-Tutorial.pdf` (3.0 MB)

**This is a real gap** — the prior `reference_jm_die_tribal_wiki_100pct_complete_2026_05_26.md` implicitly claimed 100% coverage, but Mastercam was silently 0%. Surfacing here per R12 fail-loud.

**Resolution paths (operator decision):**
1. Provide PDF passwords externally; re-run lima
2. Acquire eMastercam membership (~$50-100/tutorial) for ungated PDF samples
3. Substitute with Mastercam-content scraping from free sources (cnccookbook articles, In-House Solutions free 2025 training [referenced via Practical Machinist])

## Outstanding 403s (Playwright queue)

- `https://my.solidworks.com/solidworks/guide/SOLIDWORKS_Introduction_EN.pdf` — Dassault portal session-cookie required
- `https://static.sdcpublications.com/pdfsample/978-1-63057-634-9-1-ntim55rhxk.pdf` — SDC gating

Both need `mcp__playwright__*` browser session per [[feedback_playwright_for_online_sources]].

## Files shipped this session (slot/delta)

- iter 2 commit (after this rollup): `scripts/extract-online-cad-tips.py` (165L, sibling of lima's pypdf script)
- iter 3 commit: software-from-path mapping table extended (CATIA + NX + PowerMill)
- iter 4 commit: general-cnc dir mapping added

## Architecture relative to lima's canonical PDF extraction

```
LIMA pypdf canonical (JM DIE/TRIBAL+WIKI/*.pdf, 80 PDFs, 8,752 pages)
     |
     +-- DELTA SIBLING (this session): online-acquired/<software>/*.pdf, 12 PDFs, 1,107 pages
                                       reuses lima's regex + scoring verbatim
                                       emits to mcp-server/data/tribal/online-cad-cam-tips.jsonl
                                       embedded via scripts/embed-tribal-jsonl-into-index.mjs
```

Same notability floor 0.4, same RPM/SFM/IPM regex, same formula/safety scoring, same TOC penalty.

## Now-live in [[reference_tribal_by_domain_inject|tribal-by-domain-inject]]

- `cad`-domain slots: 262 CATIA + 196 NX + 76 Inventor = 534 new structured-recall hits
- `cam`-domain slots: 51 Fusion + 23 hyperMILL brochures + 53 PowerMill = 127 new hits
- `general`-domain slots: 430 fundamentals from Titans + Urban Workshop

## Open follow-up units

- **U-PLAYWRIGHT-COOKIE-FOR-AUTHED-SOURCES** — Playwright-acquire the 2 deferred 403s (Dassault + SDC) + any emastercam.com samples that need session cookies
- **U-MASTERCAM-PASSWORD-OR-SUBSTITUTE** — operator decision on the 2 encrypted local PDFs
- **U-EXTEND-TO-RHINO-FREECAD-ONSHAPE** — broaden to non-flagship CAD tools (lower priority — JM Die doesn't use them, but the AI's domain breadth grows)

## Related

- [[reference_cad_cam_software_tips_catalog_2026_05_26]] — iter 1 catalog with 16-source priority table
- [[reference_lima_pypdf_extraction_canonical_2026_05_26]] — canonical method this session reused
- [[reference_jm_die_tribal_wiki_100pct_complete_2026_05_26]] — superseded "100% complete" claim (Mastercam was silently 0%)
- [[reference_embed_tribal_jsonl_2026_05_26]] — the jsonl embedder that landed these into the recall index
- [[feedback_use_lima_pypdf_page_extractor]] — canonical-method standing rule
- [[feedback_no_public_h_drive]] — corpus internal-only
- [[feedback_playwright_for_online_sources]] — deferred 403s queued for Playwright
