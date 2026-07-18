---
title: PDF-Corpus-Mill Open Source Atlas (living-source keep-learning directory — where to keep learning mill-domain document extraction from free/legal sources)
galaxy: pdf-corpus-mill
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: "Live WebFetch of each candidate this session; a source is listed ONLY if the fetch returned content that confirmed it is real, free/legal, and reachable. Failed fetches were retried once then DROPPED, never guessed. Confirmed live this session: Tesseract OCR docs (tessdoc landing + ImproveQuality.md), pypdf ReadTheDocs, PyMuPDF ReadTheDocs, Camelot ReadTheDocs (table extraction), OpenCV official tutorials, Machinery's Handbook 6th ed. 1924 (public domain) on Internet Archive, Machining Doctor (free machining reference/calculators), NIST Office of Weights & Measures SI Units. DROPPED (unreachable/unconfirmable this session): Haas manuals page (HTTP 403), Haas DIY lessons (connection refused), Mazak USA manuals (301 redirect to marketing host with no confirmed manuals path), MIT OpenCourseWare manufacturing course slugs (repeated HTTP 404 — their URL scheme returned 404 on every tried slug). This atlas is the KEEP-LEARNING directory; it deliberately does NOT repeat the synthesized theory in pdf-corpus-mill-foundations.md and POINTS to the two parent-domain atlases (pdf-corpus + mill) for the shared spine. No paywalled or pirated sources."
tags: [pdf-corpus-mill, mill, source-atlas, living-source, keep-learning, free-course, free-textbook, open-docs, tesseract, pypdf, pymupdf, camelot, opencv, table-extraction, machinerys-handbook, public-domain, machining-doctor, nist, ocr, document-extraction, pointer-to-pdf-corpus-atlas, pointer-to-mill-atlas]
---

# PDF-Corpus-Mill Open Source Atlas

The **living-source curriculum** for the **pdf-corpus-mill** galaxy: a curated, kept-fresh directory of WHERE TO KEEP LEARNING mill-domain document extraction from reputable FREE/LEGAL sources, so the knowledge never goes stagnant. This galaxy combines **PDF/OCR corpus extraction** with **mill machining documents** — milling vendor manuals, end-mill / insert / holder tool catalogs (which are *tables*), speeds/feeds references, machine code + alarm tables — turned into structured, searchable shop knowledge.

This entry is DISTINCT from its siblings — read those first, do not look here for what they hold:

- **[`pdf-corpus-mill-foundations.md`](pdf-corpus-mill-foundations.md)** — the synthesized *theory* (table extraction as specialized IE, template/zone OCR, domain-lexicon-constrained NER, tolerant retrieval). This atlas does NOT re-derive it.
- **`pdf-corpus-mill-applied-practice.md`** — the practitioner gotchas (not yet created as of this verification pass).

And because pdf-corpus-mill is a *child of two parent domains*, the bulk of the general curriculum lives in the parent atlases — **point there, do not duplicate**:

- **Parent A — the PDF/OCR/corpus spine:** `knowledge/wiki/pdf-corpus/pdf-corpus-source-atlas.md` (the general document-extraction keep-learning directory; sibling-in-progress in this same meta-pass — until it lands, the confirmed academic spine is in [`knowledge/wiki/pdf-corpus/pdf-corpus-foundations.md`](../pdf-corpus/pdf-corpus-foundations.md)).
- **Parent B — the mill machining spine:** [`knowledge/wiki/mill/mill-source-atlas.md`](../mill/mill-source-atlas.md) (the milling-domain keep-learning directory — machining handbooks, CNC programming, tool/material data; CONFIRMED on disk this session).

What follows is ONLY the keep-learning sources that sit at the *intersection*: the document-extraction tooling you point at mill PDFs, plus the free mill reference documents that ARE the corpus.

## Free document-extraction tooling docs (the extractors you run on mill PDFs)

These are the open-source libraries the corpus loader actually invokes. Their official docs are the canonical, kept-current curriculum for the OCR/table/text-extraction stages.

- **Tesseract OCR — official documentation (tessdoc).** https://tesseract-ocr.github.io/tessdoc/ — installation, command-line usage, LSTM model training (tesstrain), and quality tips for the open-source Apache-2.0 OCR engine. *Feeds:* the OCR stage that turns scanned Haas/Mazak manual pages and old tool-catalog scans into text. The training section is how you build a milling-lexicon-tuned model.
- **Tesseract — "Improving the quality of the output" (ImproveQuality.md).** https://github.com/tesseract-ocr/tessdoc/blob/main/ImproveQuality.md — concrete, kept-current guidance: 300+ DPI rescaling, Otsu/Sauvola binarization, noise removal, deskew, the 14 page-segmentation modes (PSM 0-13), and disabling the dictionary for non-standard codes. *Feeds:* the preprocessing + PSM tuning for mill scans, and the "disable dictionary" advice maps directly to OCR-ing tool SKUs / G-M codes that no English dictionary contains.
- **pypdf — official documentation.** https://pypdf.readthedocs.io/en/stable/ — pure-Python PDF library: extract text, read metadata, crop/merge/transform pages, post-process extracted text. Free and open source. *Feeds:* the born-digital (text-layer) extraction path for mill PDFs that already carry selectable text — no OCR needed; this is the cheap fast path.
- **PyMuPDF — official documentation.** https://pymupdf.readthedocs.io/en/latest/ — text extraction, table-content extraction, and rendering PDF pages to images (the bridge into OCR). *Feeds:* the page-to-image rasterization that hands scanned mill pages to Tesseract, plus its own table-content extraction for digital tool catalogs.
- **Camelot — official documentation.** https://camelot-py.readthedocs.io/en/latest/ — extracts tables from PDFs via Stream / Lattice / Network / Hybrid / ML (Table Transformer) methods. Open source. *Feeds:* the defining mill-doc stage — recovering rows/columns/cells from tool-catalog and alarm-code tables that a flat text dump scrambles (see foundations: "PDF tables have no structure markup").
- **OpenCV — official tutorials.** https://docs.opencv.org/4.x/d9/df8/tutorial_root.html — the open-source computer-vision library's tutorials, including the imgproc module (thresholding, morphology). Free/open. *Feeds:* image preprocessing before OCR (binarization, morphology, deskew) for low-quality scanned mill manuals, and the routing of drawing-bearing pages toward the blueprint-vision spine.

## Free mill reference documents (the corpus content itself + ground truth)

These are the free, legal milling references whose contents the corpus ingests and validates against. They double as ground truth for checking extraction accuracy.

- **Machinery's Handbook, 6th edition (1924) — public domain, Internet Archive.** https://archive.org/details/machineryshandbo00indu — the classic machinist reference ("machine design and shop practice for the mechanical engineer, draftsman, toolmaker and machinist"), freely downloadable in PDF/EPUB/full-text because the 1924 edition is public domain. *Feeds:* a real, table-rich, machining-vocabulary corpus to test table extraction + milling-NER on, and a free baseline of speeds/feeds/threading/material tables. NOTE: a 1924 edition is historically accurate but NOT current cutting data — use it for *extraction-pipeline ground truth and vocabulary*, not as live shop speeds/feeds (current values are owned by the speed-feed galaxy).
- **Machining Doctor — free machining reference & calculators.** https://www.machiningdoctor.com/ — free, no-login speeds/feeds and threading calculators, machinability + recommended cutting conditions + carbide grades for 700+ materials, and material-group / tolerance / drill / tap tables. *Feeds:* a current, free reference vocabulary (material codes, tool/grade nomenclature, table column conventions) to build and validate the milling domain lexicon and to sanity-check extracted catalog rows.
- **NIST Office of Weights & Measures — SI Units.** https://www.nist.gov/pml/owm/metric-si/si-units — free authoritative SI / unit reference (SP 330, SP 811 special publications). *Feeds:* the units-normalization stage — milling docs mix inch and metric (diameter in mm vs in, SFM vs m/min, IPT vs mm/tooth); a canonical free unit reference grounds the corpus's unit-tagging and prevents the 25.4x scale-error class.

## Pointers to the parent-domain curricula (do not duplicate here)

For the broad foundations — the PDF object model, IR/retrieval theory, computer-vision textbook, CNC programming courses, machining-process fundamentals — go to the parent atlases. They carry the WebFetch-confirmed free college courses and textbooks for those domains so this intersection entry stays small.

- **PDF/OCR/corpus theory & courses** -> `knowledge/wiki/pdf-corpus/pdf-corpus-source-atlas.md` (parent atlas) and [`knowledge/wiki/pdf-corpus/pdf-corpus-foundations.md`](../pdf-corpus/pdf-corpus-foundations.md) (confirmed Stanford Introduction to Information Retrieval free textbook + Szeliski Computer Vision free textbook live there). *Feeds:* the retrieval, document-AI, and vision spine of this galaxy.
- **Mill machining theory, handbooks & programming** -> [`knowledge/wiki/mill/mill-source-atlas.md`](../mill/mill-source-atlas.md) (parent atlas). *Feeds:* the domain side — what the milling documents are *about*, so extracted entities can be validated against real machining knowledge.

## Owner-gate (NOT promoted — re-derive before relying)

- **Haas / Mazak official manual download pages.** Could NOT be confirmed this session — Haas `service/manuals.html` returned HTTP 403, Haas DIY lessons refused the connection, Mazak USA manuals 301-redirected to a marketing host with no confirmed manuals path. These vendors DO publish operator/programming manuals, but a free, directly-reachable URL was not verified this pass; golf must re-locate the live download link before citing it. (Do not fabricate the URL.)
- **A specific free MIT OpenCourseWare manufacturing/machining course.** Every tried OCW course slug returned HTTP 404 (their URL scheme appears to have changed); a confirmed live course URL is gated until re-located. The parent `mill-source-atlas.md` is the place to carry it once confirmed.
- **Any numeric extraction-quality thresholds** (min DPI for mill scans, table cell-confidence floor, OCR word-error-rate ship gate, tolerant-retrieval edit-distance cap) stay owner-gated per galaxy rules — set and validate against the live corpus, not copied from a doc.

## Keep-fresh cadence

This is a LIVING directory — schedule re-verification so it never rots:

- **Quarterly (every ~90 days):** re-WebFetch all nine confirmed URLs in `## Sources`; a 403/404/redirect means re-locate or move the entry to the owner-gate. Re-attempt the dropped Haas/Mazak manual pages and MIT OCW course each pass — vendor doc URLs move often.
- **On every tooling major release:** when Tesseract, pypdf, PyMuPDF, Camelot, or OpenCV ships a major version, re-read its docs landing for new extraction features (e.g. Camelot already lists an ML/Table-Transformer method — a candidate upgrade for hard tool-catalog tables).
- **On corpus growth:** when a new mill vendor's manuals or a new public-domain handbook edition is ingested, add its free/legal source here and note which extraction stage it stresses.
- **Sibling sync:** when `pdf-corpus-mill-applied-practice.md` and the parent `pdf-corpus-source-atlas.md` land, re-check this entry's pointers resolve.
- **Honesty gate (R12):** never add a source without a fresh WebFetch confirming it is real, free, and reachable. A short verified list beats a long fabricated one.

## Sources (distinct URLs WebFetch-confirmed live + free this session)

- https://tesseract-ocr.github.io/tessdoc/ (Tesseract OCR official docs — install/usage/training/quality; Apache-2.0 open source)
- https://github.com/tesseract-ocr/tessdoc/blob/main/ImproveQuality.md (Tesseract official "Improve Quality" — DPI, binarization, noise removal, deskew, PSM 0-13, disable-dictionary for codes)
- https://pypdf.readthedocs.io/en/stable/ (pypdf official docs — free/open pure-Python PDF text extraction, metadata, page ops)
- https://pymupdf.readthedocs.io/en/latest/ (PyMuPDF official docs — text + table extraction, page-to-image rendering for OCR)
- https://camelot-py.readthedocs.io/en/latest/ (Camelot official docs — open-source PDF table extraction: Stream/Lattice/Network/Hybrid/ML)
- https://docs.opencv.org/4.x/d9/df8/tutorial_root.html (OpenCV official tutorials — open-source CV; imgproc thresholding/morphology for OCR preprocessing)
- https://archive.org/details/machineryshandbo00indu (Machinery's Handbook 6th ed. 1924 — public domain, free PDF/EPUB/full-text on Internet Archive)
- https://www.machiningdoctor.com/ (Machining Doctor — free machining reference, speeds/feeds calculators, 700+ material machinability/grade tables)
- https://www.nist.gov/pml/owm/metric-si/si-units (NIST Office of Weights & Measures — free SI units reference, SP 330 / SP 811)
