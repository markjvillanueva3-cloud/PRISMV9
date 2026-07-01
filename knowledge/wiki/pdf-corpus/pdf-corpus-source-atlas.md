---
title: PDF-Corpus Open Source Atlas (OCR + document-extraction living curriculum)
galaxy: pdf-corpus
owner_slot: xray
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: "Each URL below was fetched with WebFetch this session and confirmed to resolve to live, on-topic, free/legal content for OCR / PDF text-extraction / document-AI / document-image datasets. URLs that returned a certificate error, 403/404, or rendered only a generic title/JS shell that could not be positively confirmed were retried once then DROPPED, not listed (R12). Two candidates were dropped on this pass: the Kaggle Datasets portal (only a single title line rendered to the fetch -- free-access not positively confirmable) and the DocVQA Robust-Reading-Competition challenge page at rrc.cvc.uab.es (TLS 'unable to verify the first certificate' on two attempts)."
tags: [pdf-corpus, atlas, source-directory, ocr, pdf-extraction, document-ai, layout-analysis, tesseract, pypdf, pdfminer, funsd, rvl-cdip, docvqa, information-retrieval, free-sources, living-curriculum]
---

# PDF-Corpus Open Source Atlas

A curated directory of the best **free + legal LIVING** resources for the **pdf-corpus** galaxy: the document-extraction corpus layer that turns PDFs and scanned documents into structured, searchable, indexable text + metadata (text-PDF decode / raster OCR / layout-tagged regions / tokenized terms). Unlike a static reading list, these point at **continuously-updated** documentation homepages, full course series, standards landing pages, and open dataset/archive portals, so the galaxy's "keep-learning" curriculum stays current by construction.

**Scope note (R8 — not a duplicate).** This atlas is DISTINCT from its siblings and must not repeat them:
- [`pdf-corpus-foundations.md`](pdf-corpus-foundations.md) — the synthesized theory (PDF object model / ISO 32000, the text-vs-raster fork, the OCR preprocessing+recognition primitives, document layout analysis, the IR corpus-as-index framing, PDF/A) with a per-claim Sources list of individual article pages. This atlas curates BROADER living *sources* to keep learning FROM, not the theory itself.
- The **blueprint-vision** galaxy owns the shared machine-vision / metrology / GD&T / engineering-drawing spine — see [`../blueprint-vision/blueprint-vision-source-atlas.md`](../blueprint-vision/blueprint-vision-source-atlas.md) (MIT 6.801 machine vision, OpenCV, NIST metrology, ASME Y14.5, NPTEL Engineering Drawing). pdf-corpus is the sibling **document-corpus** layer: where blueprint-vision reads the *drawing pixels*, pdf-corpus owns the *document/text-extraction pipeline*. Do NOT re-list the blueprint-vision drawing/GD&T sources here; point there.

This galaxy's distinct living-source focus: **OCR engines + PDF parsing libraries + document-AI / layout literature + document-image datasets + the information-retrieval framing**. Every entry was link-verified on the date in the frontmatter. This is a link directory only — no physics / numeric / accuracy claims are asserted here (those stay owner-gated to xray per the foundations entry).

## Official docs & toolchain (the living reference manuals)

The OCR engine + PDF-parsing library documentation a corpus pipeline is actually built against. These are versioned and continuously updated — the canonical "keep-fresh" reference layer.

- **Tesseract OCR — official user manual** — https://tesseract-ocr.github.io/tessdoc/ — Apache-2.0 open-source OCR engine; covers install, command-line usage, input formats, the Tesseract-5 training pipeline (tesstrain), API examples, and recognition-improvement tips. Feeds the galaxy's **raster branch** (the engine the pipeline routes to when a page is image-only) and the hOCR positioned-token output the layout stage consumes.
- **pypdf — official documentation** — https://pypdf.readthedocs.io/en/stable/ — Free pure-Python PDF library; covers text + metadata extraction, page transforms, merging/cropping, encryption, and PDF/A compliance. Feeds the galaxy's **text-PDF decode branch** (extracting the real text layer when one exists, before any OCR is considered).
- **pdfminer.six — official documentation** — https://pdfminersix.readthedocs.io/en/latest/ — Free open-source PDF text+layout extractor; covers commandline + Python text extraction, layout grouping, image/font extraction, and CID/Type1/TrueType + CJK encoding handling. Feeds the galaxy's **font/encoding decode + per-page layout-grouping** stage — the deeper "why did this character come out wrong" toolchain when pypdf's flat extraction is not enough.
- **Hugging Face Transformers — Document Question Answering task guide** — https://huggingface.co/docs/transformers/tasks/document_question_answering — Free docs walking a full document-AI pipeline end to end: Tesseract OCR -> word+bounding-box tokens -> LayoutLMv2 multimodal model on the DocVQA dataset. Feeds the galaxy's **document-AI / layout-aware extraction** leg — the modern neural successor to flat OCR, where text + position + image are fused.
- **PDF Association — ISO 32000 (the PDF standard)** — https://pdfa.org/resource/iso-32000-pdf/ — Reputable industry body (ISO TC 171 SC 2 Liaison-A). Confirms ISO 32000 is the core PDF spec for PDF 1.7 + PDF 2.0, and provides **ISO 32000-2:2020 at no cost** (Adobe/Apryse/Foxit-sponsored). Feeds the galaxy's **PDF object-model parsing** leg and directly closes the foundations entry's owner-gate (the Adobe spec PDF exceeded the WebFetch size limit; the free ISO 32000-2 here is the primary standard to re-derive operator-grammar facts against).

## Free college courses & lecture videos

Full course homepages with open materials and public lecture-video playlists. Audit-free / open courseware.

- **Stanford CS224N — Natural Language Processing with Deep Learning** — https://web.stanford.edu/class/cs224n/ — Free public slides + assignments + a public YouTube lecture playlist (course explicitly permits anyone to use the resources). Covers word vectors, transformers, language models, retrieval-augmented generation, and agents. Feeds the galaxy's **tokenization -> terms / text-understanding** leg (the IR front end the corpus becomes searchable through) and the document-AI modeling that sits atop extracted text.
- **Hugging Face — LLM/NLP Course** — https://huggingface.co/learn/nlp-course/chapter1/1 — "Completely free and without ads." Teaches the Transformers + Tokenizers + Datasets libraries, fine-tuning, and the `pipeline()` task abstraction. Feeds the galaxy's **tokenization + dataset-loading + model fine-tuning** practice — the hands-on path from extracted document text to a trained extractor/classifier.
- **Stanford CS231n — Deep Learning for Computer Vision (course notes)** — https://cs231n.github.io/ — Free, continuously-updated course notes (image classification, CNNs, optimization, transfer learning, transformer-based vision). Feeds the galaxy's **neural-OCR / document-image classification** backbone — the CNN/feature-learning theory under modern OCR and document-type classifiers (the foundations entry points the *classical* OCR-recognition theory at Szeliski; CS231n is the neural complement).

## Free textbooks & references

Open-license / free-for-personal-use books and continuously-maintained reference texts.

- **Stanford — Introduction to Information Retrieval (Manning, Raghavan, Schutze)** — https://nlp.stanford.edu/IR-book/ — The full graduate IR textbook, free online (HTML edition + per-chapter PDFs). Covers obtaining the character sequence from a binary document, tokenization -> terms, index construction/compression, and text classification. Feeds the galaxy's **corpus-as-index** framing — the authoritative naming of the exact decode -> tokenize -> index pipeline the extractor is the front end of (the foundations entry cites two of its sections; this is the broader living entry point).
- **Szeliski — Computer Vision: Algorithms and Applications, 2nd ed. (book homepage)** — https://szeliski.org/Book/ — Free downloadable PDF for personal use (the author asks you link here, not repost). The standard CV text grounding image processing + recognition. Feeds the galaxy's **classical OCR-recognition / image-preprocessing** theory (binarization, feature extraction). Shared with blueprint-vision — listed here as the corpus-OCR entry point; the chapter-to-topic mapping lives in the blueprint-vision foundations entry.

## Document-image data & open archives

Open datasets and free archives — the "data to train + benchmark the extractor on" layer, and the bulk free-document corpora.

- **RVL-CDIP — document image classification dataset** — https://adamharley.com/rvl-cdip/ — Free for research (HuggingFace Datasets + Google Drive backup): 400,000 grayscale document images in 16 business-document classes (letters, invoices, emails, resumes, forms...). Feeds the galaxy's **document-type classification / corpus-routing** leg — learning *what kind of document* a page is before extraction.
- **FUNSD — Form Understanding in Noisy Scanned Documents (official page)** — https://guillaumejaume.github.io/FUNSD/ — Research dataset: 199 fully-annotated noisy scanned forms (31,485 words, 9,707 semantic entities, 5,304 relations) for text detection, OCR, spatial layout analysis, and entity/relation labeling. Feeds the galaxy's **layout analysis + form/entity extraction** leg — the canonical benchmark for "recover structure, not just characters."
- **FUNSD — Hugging Face mirror (token + bbox + NER tags)** — https://huggingface.co/datasets/nielsr/funsd-layoutlmv3 — Freely-loadable preprocessed FUNSD (images + tokens + bounding boxes + NER tags, 149 train / 50 test) ready for `load_dataset`. Feeds the galaxy's **layout-aware model training** — the one-line-load form of FUNSD for the LayoutLM-style document-AI pipeline above.
- **Internet Archive — Texts collection** — https://archive.org/details/texts — A free, legal digital library of millions of digitized books/documents (large public-domain holdings, many as scanned PDFs). Feeds the galaxy's **bulk raw-document corpus** for OCR pipeline stress-testing and the messy-scan distribution the extractor must survive.

## Living literature (continuously-published, free to read)

The open-access feed for staying current on OCR / document-AI / layout research as it evolves.

- **arXiv — Computer Vision and Pattern Recognition (cs.CV) recent listing** — https://arxiv.org/list/cs.CV/recent — Free open-access preprint feed (abstracts + PDFs + HTML), ~750 new entries/month, carrying the current document-analysis / OCR / layout / chart-extraction research. Feeds the galaxy's **state-of-the-art tracking** — the freshest methods before they reach the toolchain docs. (Note: cs.CV is broad; for document-specific work, search the listing for "document"/"OCR"/"layout" rather than skimming the raw feed.)
- **OCR-D — open OCR & document-analysis framework** — https://ocr-d.de/en/ — "Free for any purpose" open-source framework + community (DFG-funded) for mass digitisation and building large full-text corpora with user-defined OCR workflows (CLI, OCR4all, Kitodo). Feeds the galaxy's **corpus-scale OCR-workflow orchestration** leg — the reference design for chaining preprocessing -> OCR -> layout -> output at corpus scale, and a healthy community to learn workflow patterns from.

## Keep-fresh cadence

This atlas is a **link directory, and link-rot is its primary decay mode** — docs sites re-version, course pages renumber, dataset hosts migrate to new mirrors, standards pages restructure. The freshness mechanism is **periodic re-verification**, owned by slot **xray**:

- **Re-fetch every URL here on a recurring cadence** (suggest quarterly, or immediately whenever an entry is found dead in use). Drop any that 404 / 403 / hit a cert error / redirect off-topic; promote replacements from `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` or fresh discovery.
- **Re-attempt the dropped candidates with an interactive (non-fetch) check** before relying on them: the **DocVQA Robust Reading Competition** challenge (`rrc.cvc.uab.es/?ch=17` — failed TLS cert verification to the automated fetch twice, but is the canonical document-VQA benchmark referenced by the HF Document-QA guide above and is very likely live in a browser) and the **Kaggle Datasets** portal (`kaggle.com/datasets` — rendered only a title line to the fetch; free-access not positively confirmable without JS). Add them only after a positive interactive confirmation.
- **Bump the frontmatter on each pass**: the `status: VERIFIED-PARTIAL` flag and the dated `verified_by` field mark the last verification; update both, and move any newly-confirmed source out of the "dropped" list above into its themed section.
- **Companion freshness for the toolchain docs**: when a re-check finds a library has cut a major version (pypdf, pdfminer.six, Tesseract, Transformers), confirm the URL still points at the *current stable* (e.g. pypdf `/en/stable/`, pdfminer.six `/en/latest/`) rather than a pinned old release.

## Sources

Distinct URLs WebFetch-confirmed live, free/legal, and on-topic this session (2026-06-10):

- https://tesseract-ocr.github.io/tessdoc/ (Tesseract OCR official manual — Apache-2.0 OCR engine)
- https://pypdf.readthedocs.io/en/stable/ (pypdf official docs — pure-Python PDF text/metadata extraction)
- https://pdfminersix.readthedocs.io/en/latest/ (pdfminer.six official docs — PDF text+layout+font/encoding extraction)
- https://huggingface.co/docs/transformers/tasks/document_question_answering (HF Transformers Document QA — Tesseract+LayoutLMv2+DocVQA document-AI pipeline)
- https://pdfa.org/resource/iso-32000-pdf/ (PDF Association — ISO 32000 / free ISO 32000-2:2020 PDF spec)
- https://web.stanford.edu/class/cs224n/ (Stanford CS224N NLP w/ Deep Learning — free slides + public YouTube playlist)
- https://huggingface.co/learn/nlp-course/chapter1/1 (Hugging Face LLM/NLP course — free, transformers/tokenizers/datasets)
- https://cs231n.github.io/ (Stanford CS231n CV course notes — free, CNNs/training/transfer-learning)
- https://nlp.stanford.edu/IR-book/ (Stanford Introduction to Information Retrieval — free full textbook online)
- https://szeliski.org/Book/ (Szeliski Computer Vision 2nd ed. — free-for-personal-use PDF)
- https://adamharley.com/rvl-cdip/ (RVL-CDIP — 400k-image 16-class document classification dataset, free for research)
- https://guillaumejaume.github.io/FUNSD/ (FUNSD official — noisy scanned form understanding dataset)
- https://huggingface.co/datasets/nielsr/funsd-layoutlmv3 (FUNSD Hugging Face mirror — tokens+bboxes+NER tags)
- https://archive.org/details/texts (Internet Archive Texts — free legal digitized-document library)
- https://arxiv.org/list/cs.CV/recent (arXiv cs.CV recent — free open-access CV/document-analysis preprint feed)
- https://ocr-d.de/en/ (OCR-D — free open-source corpus-scale OCR workflow framework)
