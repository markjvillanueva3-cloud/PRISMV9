---
title: PDF Research Acquisition Queue (2026-05-26)
type: architecture
created: 2026-05-26
author: slot:kilo
status: shipped
---

# PDF Research Acquisition Queue

Curated catalog of authoritative PDFs / books / papers / standards to fill PRISM corpus gaps in: **CAD 2D + 3D drawing fundamentals**, **complex assemblies + drawings**, **blisk machining**, **turbine blade machining**, and **injection mold design + machining**.

## Origin

Operator directive 2026-05-26: *"do more deep research hunting for pdfs and books for cad drawing 2d and 3d, assemblies and complex drawings, do very deep dive in blisks, turbines and molds and how to machine them"*.

## Existing PRISM coverage baseline

| Topic | Mentions in 78,561-page curriculum | Filename-matching PDFs in 3,936 manifest |
|---|---|---|
| blisk | 22 | 0 |
| turbine | 82 | 0 |
| mold | 174 | 0 |
| assembly + GD&T | 134 | 1 (Beginner's Guide to GD&T) |
| CAD 2D | 94 | 0 |
| CAD 3D | 1,209 | 0 (incidental ML/Mastercam mentions) |

The 1,209 CAD-3D mentions are mostly incidental (Mastercam ReadMe etc.) — no dedicated CAD parametric-modeling textbook is in the corpus.

## Acquisition queue (21 sources)

Full structured manifest with priorities + URLs + acquisition action per entry: `state/shared/specs/PDF-RESEARCH-QUEUE-2026-05-26.json`.

### Headline sources by category

#### Blisk 5-axis machining (P0)
- **[Finish-Machining Strategies for Bladed Disks](https://etheses.whiterose.ac.uk/id/eprint/32833/1/Thesis_Iraitz_Arrospide.pdf)** — Iraitz Arrospide Garro PhD thesis, University of Sheffield. Open-access full book-length reference covering IBR 5-axis roughing + finishing strategies + production line distribution. **Direct download.**
- **[Linear Interpolation Method for Fan Blisk Surfaces](https://www.mdpi.com/2075-1702/13/9/768)** — MDPI open access. Bowed-twisted blade surface deviation analysis.
- ResearchGate papers on flank milling + barrel-ball cutter + IBR optimised methodology (4 papers — require ResearchGate account).

#### Turbine blade airfoil + vane machining (P0)
- **[hyperMILL Turbine Blade Brochure](https://www.openmind-tech.com/en-us/cam/5-axis-milling/turbine-blade/)** — OPEN MIND vendor distributed PDF on swarf cutting + best-fit + lead-angle correction.
- **NURBS Blade 5-Axis Machining** (ResearchGate) — custom tool-shape + motion co-optimization. Most rigorous math reference for blade finishing.
- ASM Handbook Vol 16 + SME Tool & Manufacturing Engineers Handbook Vol 1 — canonical paid references for nickel-superalloy / Ti-6Al-4V machining.

#### Injection mold design + machining (P0)
- **[Rosato Injection Molding Handbook 3rd Ed (Springer preview)](https://link.springer.com/content/pdf/bfm:978-1-4615-4597-2/1.pdf)** — 914 figures, 209 tables. Front-matter preview is free; full handbook paid.
- **[Eastman Polymers Mold Design Guidelines](https://www.eastman.com/content/dam/eastman/corporate/en/literature/s/sptrs5344.pdf)** — open-access. P20/H13/S7 selection + cooling channel placement.
- **[Copper Development Association Mold Design Guidelines (9-part)](https://copper.org/publications/pub_list/pdf/A7023-MoldDesignGuidelines.pdf)** — open-access. Conformal cooling + copper insert thermal benefits.

#### GD&T + Engineering Drawing Standards (P1)
- **[ASME Y14.5-2009 Official Preview](https://webstore.ansi.org/preview-pages/ASME/preview_ASME+Y14.5-2009.pdf)** — Open preview. Feature Control Frame + Datum Reference Frame + Degrees of Freedom.
- **[Mitutoyo ASME Y14.5-2018 Whitepaper](https://www.mitutoyo.com/webfoo/wp-content/uploads/ASME_Y14.5-2018_Salsbury.pdf)** — Open-access bridge between ASME and ISO.

#### CAD Assembly + Complex Drawing Textbooks (P1)
- **[SDC Parametric Modeling with SOLIDWORKS 2022 sample](https://static.sdcpublications.com/pdfsample/978-1-63057-463-5-2-algz89ni4b.pdf)** — publisher-distributed sample chapter.
- **[CMU ME 24-688 Assembly Drawings handout](https://www.andrew.cmu.edu/course/24-688/handouts/Week%206%20-%20Inventor%20Drawings/Cluster%20Projects/Week%206%20-%20Project%203%20-%20Assembly%20Drawings.pdf)** — drill-press vise exploded view + BOM workflow.

## Acquisition status summary

| Status | Count |
|---|---|
| DIRECT_DOWNLOAD (open access) | 9 |
| DIRECT_DOWNLOAD_PREVIEW (free preview of paid book) | 2 |
| DIRECT_DOWNLOAD_SAMPLE (publisher-distributed sample) | 1 |
| REVIEW_LICENSE_THEN_DOWNLOAD (third-party hosts — verify) | 2 |
| REQUIRES_CREDENTIALS (ResearchGate + Academia.edu) | 4 |
| PURCHASE_OR_INSTITUTION (paid handbooks) | 3 |
| **Total** | **21** |

**12 sources can be acquired directly with no operator gate**: 9 fully open + 2 preview + 1 sample. These should be downloaded into `H:/prism/resources/ACQUIRED-2026-05-26/<topic>/<filename>.pdf` and then the existing extraction pipeline re-runs to fold them into the curriculum corpus.

## Recommended pipeline

```
1. Operator approves acquisition queue
2. Download 12 direct-acquirable PDFs (~150-300 MB)
3. node scripts/build-cad-cam-resources-pdf-index.mjs       # re-index
4. node scripts/extract-cad-cam-pdf-content.mjs --domain cam # extract
5. node scripts/extract-pdf-pages-curriculum.mjs --domain cam,training # curriculum
6. Result: ~3,000-5,000 new training-ready pages on blisk/turbine/mold/CAD
```

## Cross-refs

- `state/shared/specs/PDF-RESEARCH-QUEUE-2026-05-26.json` — structured manifest with per-source metadata
- [[cad-cam-resources-pdf-index]] — existing PDF index this queue extends
- [[cam-knowledge-index]] — existing CAM knowledge surface
- [[reference_cad_cam_pdf_extraction_2026_05_26]] — prior session memo
- `scripts/build-cad-cam-resources-pdf-index.mjs` — pipeline entry point
