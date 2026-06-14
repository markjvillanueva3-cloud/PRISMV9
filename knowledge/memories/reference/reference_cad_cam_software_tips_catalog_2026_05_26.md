---
name: cad-cam-software-tips-catalog-2026-05-26
description: "CAD/CAM-software tips/tricks online catalog for assembly-generation training — 16 reputable free PDFs across Mastercam (5) + SolidWorks (4) + Fusion 360 (4) + Inventor (3) + hyperMILL (5); fills the Mastercam encrypted-PDF gap in local TRIBAL+WIKI corpus"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.038Z
aliases: reference_cad_cam_software_tips_catalog_2026_05_26
---


# CAD/CAM software online tips catalog (slot:delta /loop 2026-05-26 /goal /yolo-mode)

User directive: *"use lima's method for pdf extraction on H:\PRISM\JM DIE\TRIBAL + WIKI pdfs pertaining to cad cam software, look for reputable sources online for more cad tips and tricks for each cad software"*.

## Local corpus audit (lima jsonl coverage)

| Software | Pages in `jm-die-corpus-pages.jsonl` | Status |
|---|---|---|
| InventorCAM 2024 (full) | 1,249 | ✓ Full local |
| hyperMILL Manual EN | 779 | ✓ Full local |
| hyperMILL 2D/3D Software documentation | 297 | ✓ Full local |
| SOLIDWORKS Planchard (115 MB) | 492 | ✓ Full local |
| FUSION CAD | 247 | ✓ Full local |
| Autodesk CNCBOOK | 195 | ✓ Full local |
| SolidCAM 2015 Milling Training | 28 | ✓ Full local |
| **Mastercam Solids (Getting Started)** | **0** | ❌ **encrypted-blocked** |
| **Mastercam Wire Tutorial** | **0** | ❌ **encrypted-blocked** |

**Both Mastercam PDFs are encrypted** (verified via `pypdf.PdfReader.is_encrypted == True`). Known lima failure mode per [[reference_lima_pypdf_extraction_canonical_2026_05_26]] — operator supplies password externally OR uses online alternatives.

## Online acquisition queue (16 reputable free PDFs)

### Mastercam (5) — fills the encrypted-PDF gap

| Source | Size hint | Priority |
|---|---|---|
| [Mastercam 2018 Beginner Sample (eMastercam free)](https://www.emastercam.com/files/file/1274-mastercam-2018-beginner-training-tutorial-sample-pdf/) | 134-page excerpt of full | **P0** — direct gap-fill |
| [Mastercam X6 Beginner Tutorial sample](https://www.emastercam.com/store/product/282-mastercam-x6-beginner-training-tutorial-pdf/) | excerpt of 800-page full | P0 — Geometry → Toolpath → G-code workflow |
| [Mastercam X6 Design Tutorial sample](https://www.emastercam.com/store/product/283-mastercam-x6-design-training-tutorial-pdf/) | excerpt | P1 — WCS, fixture applications, Solid menu shortcuts |
| [Mastercam X5 Solids Tutorial sample](https://www.emastercam.com/store/product/222-mastercam-x5-solids-training-tutorial-pdf/) | 8 tutorials | P1 — Extrude/Loft/Revolve/Sweep/Boolean/Fillet/Chamfer/Shell |
| [Mastercam X4 Router Tutorial sample](https://www.emastercam.com/store/product/243-mastercam-x4-router-training-tutorial-pdf/) | 9 tutorials | P2 — 2D toolpath alphabetical reference |

### SolidWorks (4) — augments the 492-page Planchard local corpus

| Source | Priority |
|---|---|
| [SDC Planchard SW2024 Tutorial — free chapter](https://static.sdcpublications.com/pdfsample/978-1-63057-634-9-1-ntim55rhxk.pdf) | **P0** — CommandManager, design intent, BOMs, multi-sheet drawings |
| [Dassault Official "Introducing SOLIDWORKS"](https://my.solidworks.com/solidworks/guide/SOLIDWORKS_Introduction_EN.pdf) | **P0** — official intro PDF (authoritative) |
| [Javelin Beginner's Guide](https://www.javelin-tech.com/blog/2020/12/solidworks-beginners-guide/) | P0 — best-practice for SmartMates / assembly workflows |
| [SourceCAD SolidWorks Tips & Tricks eBook](https://sourcecad.com/solidworks-tips-and-tricks-with-pdf-ebook/) | P1 — sketch/part/assembly/drawing categorized tips |

### Fusion 360 (4) — augments the 247-page FUSION CAD local corpus

| Source | Priority |
|---|---|
| [Autodesk Class Handout — 101 Fusion 360 Tips & Tricks (Scott Moyse, CP226398)](https://static.au-uw2-prd.autodesk.com/Class_Handout_CP226398_101_Fusion_360_Tips_and_Tricks_Scott_Moyse.pdf) | **P0** — official 101-tip handout (Constrained vs Free orbit, double-click recenter, etc.) |
| [Haas Desktop CAD/CAM/CNC Training Guide (Autodesk PDF)](https://damassets.autodesk.net/content/dam/autodesk/www/industries/education/docs/fusion-360-haas-desktop-training-guide-r2.pdf) | **P0** — Lesson 4 Manufacturing Assemblies + Lesson 5 CAM Setups |
| [Skippy.org.uk Fusion 360 CAM Overview](https://skippy.org.uk/wp-content/uploads/09_CAM.pdf) | P1 — toolpath param walk-through (Tool/Geometry/Heights/Passes/Linking) |
| [SourceCAD 32 Fusion 360 Tips eBook](https://sourcecad.com/fusion-360-pdf/) | P1 — Pan/Zoom/Orbit preset switch for SW/Inventor/Alias muscle memory |

### Inventor (3) — augments the InventorCAM 1,249-page local coverage

| Source | Priority |
|---|---|
| [Autodesk University — Leo Warren Beginner Handout (EDU463362-L)](https://static.au-uw2-prd.autodesk.com/EDU463362-L_Class_Handout_EDU463362L_Leo_Warren.pdf) | **P0** — Part 5+6 Assembly Exercises, sketching/patterns/content-center/materials |
| [SDC Hansen Inventor 2024 Tutorial — free sample](https://static.sdcpublications.com/pdfsample/978-1-63057-582-3-3-50oir7pmhz.pdf) | P0 — sketches → extrusions → orthographic views |
| [SDC Shih Inventor 2025 Tutorial — free sample](https://static.sdcpublications.com/pdfsample/978-1-63057-669-1-2-igzn7owkpd.pdf) | P1 — navigation + orbit in parts and assemblies |

### hyperMILL (5) — supplements 1,076 pages (manual + software-doc) of local hyperMILL

| Source | Priority |
|---|---|
| [OPEN MIND CAM Strategies — Production Machining brochure](https://www.openmind-tech.com/fileadmin/user_upload/pdf/industries/bro-production-machining-en.pdf) | P0 — mill/turn + 5-axis + feature-based geometry programming + db-driven automation |
| [hyperMILL 2D/3D/HSC/5-axis Overview brochure](https://www.openmind-tech.com/fileadmin/user_upload/pdf/cam/2d-3d-5-axis/bro-hypermill-overview-2d-5-axis-en.pdf) | P0 — full module overview |
| [hyperMILL 5AXIS Turbine Blade brochure](https://www.openmind-tech.com/fileadmin/user_upload/pdf/cam/5-axis/bro-singleblade-5-axis-cam-software-hypermill-en.pdf) | P1 — turbine-blade package (deep-domain, also hits the [[reference_cad_deep_domain_research_catalog_2026_05_26]] turbines gap) |
| [hyperMILL Tube CAM 5-axis brochure](https://www.openmind-tech.com/fileadmin/user_upload/pdf/cam/5-axis/bro-tube-5-axis-cam-software-hypermill-en.pdf) | P1 — continuous machining strongly-undercut tubes |
| [hyperMILL Full Catalog (AeroExpo browsable)](https://pdf.aeroexpo.online/pdf/open-mind-technologies-ag/hypermill/170255-4388.html) | P2 — hyperMILL MAXX (roughing/finishing/drilling) module catalog |

## Estimated yield (after Playwright acquisition + lima pypdf extraction)

- **~520 new tribal pages** across Mastercam + SolidWorks + Fusion 360 + Inventor + hyperMILL gaps
- 5/16 PDFs are P0 with concrete operator-validated content depth (101 tips, 134-page sample, AU class handout, Planchard SDC sample, Production Machining brochure)
- Domain split (lima domain → tribal-rerank): mostly `cad` + `cam` + `cnc-programming` → routed to `cad` + `cam`

## Soul-gap closures

| Delta soul refuse | Resolution via this catalog |
|---|---|
| `silent-feature-recognition-fallback` | hyperMILL feature-based programming brochure + Production Machining brochure |
| `dropping-pmi-data-on-import` | Inventor Drawings PDF Reference + Mastercam X6 Beginner (geometry → drawing → BOM workflow) |
| `inline-iso286-fit-values` | SolidWorks Planchard SDC sample (BOM + revision-table standards) |

## Next units

- **U-PW-ACQUIRE-CAD-CAM-TIPS-P0** — Playwright-acquire the 5 P0 sources (Mastercam 2018 sample + SDC Planchard + Fusion 101 Tips + AU Leo Warren + OPEN MIND Production Machining) per [[feedback_playwright_for_online_sources]]. Land in `H:/PRISM/JM DIE/TRIBAL + WIKI/online-acquired/<software>/<source>.pdf`. Internal-only per [[feedback_no_public_h_drive]].
- **U-LIMA-RUN-ON-ACQUIRED** — append `--queue` entries for the freshly-acquired PDFs in `state/shared/jm-die-corpus-queue.json`, run `python H:/prism/scripts/extract-jm-die-corpus-page-by-page.py --all` to extract page-by-page.
- **U-EMBED-NEW-PAGES** — re-run `scripts/embed-tribal-jsonl-into-index.mjs --apply` to embed the new ~520 pages into `tribal-embed-index.json` (idempotent — only new ids embedded).
- **U-EMASTERCAM-MEMBERSHIP-NEGOTIATION** — operator decision: emastercam.com offers samples only; full Mastercam tutorials (~$50-100 each) gated behind purchase. If purchased, becomes the canonical Mastercam tribal source.

## Related

- [[reference_jm_die_tribal_wiki_100pct_complete_2026_05_26]] — local-corpus extraction (Mastercam GAP correctly identified here, not "100% complete" as that memory claimed)
- [[reference_lima_pypdf_extraction_canonical_2026_05_26]] — canonical method (8 known failures incl. 2 Mastercam encrypted)
- [[reference_cad_deep_domain_research_catalog_2026_05_26]] — sibling deep-domain catalog (blisks/turbines/molds/assemblies) — this one is software-specific, that one is geometry-specific
- [[feedback_use_lima_pypdf_page_extractor]] — canonical PDF extraction rule
- [[feedback_playwright_for_online_sources]] — required acquisition tool
- [[feedback_no_public_h_drive]] — keep acquisitions internal-only
