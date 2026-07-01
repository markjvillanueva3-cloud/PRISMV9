---
title: PDF-Corpus Applied Practice (OCR/PDF-extraction practitioner gotchas, failure modes, technique decisions)
galaxy: pdf-corpus
owner_slot: xray
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice-meta (2026-06-10)"
verification_method: "Live WebFetch of each cited free/legal source this session; only claims the fetched page actually confirmed are promoted. Sources: official pypdf docs (BSD/extract-text reliability caveats), official Tesseract docs (ImproveQuality preprocessing/DPI/PSM), the JSON grammar (json.org number/string production rules), and free reference articles for AI hallucination, idempotence (crash-safe retry), and mojibake (encoding-mismatch garble). Each practitioner gotcha is mapped to a PRISM lived regression already recorded in this fleet's CLAUDE.md ## Recent regressions (the xray OCR corpus incidents 2026-06-04..08). PRISM-specific benchmark numbers (a confidence floor, a min DPI for THIS corpus, a word-error ship gate, consensus quorum) are left owner-gated for xray. Theory it does NOT re-derive lives in the sister pdf-corpus-foundations.md (read first)."
tags: [pdf-corpus, applied-practice, tribal-knowledge, gotchas, failure-modes, ocr, pdf-extraction, pypdf, tesseract, json-parse, leading-dot-decimal, truncated-json, multi-page, page-0-only, resumability, idempotence, checkpointing, encoding, mojibake, vlm-hallucination, multi-model-consensus, xray, blueprint-vision-sibling]
---

# PDF-Corpus Applied Practice

The **practitioner-knowledge** layer for the **pdf-corpus** galaxy: the hard-won CS-engineering gotchas, failure modes, and technique decisions that the theory in [`pdf-corpus-foundations.md`](pdf-corpus-foundations.md) does not teach. The foundations entry owns *what a PDF is / how OCR works / how a corpus is indexed*. THIS entry owns *what goes wrong in practice when you point an extraction pipeline at a real, messy document corpus, and how an expert avoids it*. Each gotcha is mapped to a PRISM lived regression — pdf-corpus is the document-corpus sibling of blueprint-vision, and this fleet has already paid for most of these lessons in production (the xray OCR-corpus incidents recorded in CLAUDE.md `## Recent regressions`, 2026-06-04..08).

Read the foundations entry first; this file deliberately does NOT repeat the PDF object model, the OCR primitives, layout analysis, or the IR framing.

---

## 1. The text-vs-raster trap — "extracted text looks empty" is the silent-loss signature

The single most expensive class of bug in document extraction is treating every PDF the same way. The fork is structural, and getting it wrong yields *zero* output with *no error*.

- **A text PDF carries real characters; pypdf reads them directly and "will never confuse characters" because it does not use OCR — but a scanned PDF has no text to read.** The official docs are explicit: *"If a PDF page appears to contain only an image (e.g., a scanned document), the extracted text may be minimal or visually empty. In such cases, consider using OCR software such as Tesseract OCR."* The expert's avoidance: branch per-page on whether a real text layer exists, and treat an empty/near-empty extraction from an image-bearing page as a *route-to-OCR* signal, never as "this page has no content." [confirmed via [pypdf — Extract Text](https://pypdf.readthedocs.io/en/stable/user/extract-text.html)]
  - *PRISM hit:* the corpus router must classify decode-vs-OCR per page; misrouting a scanned drawing as text-bearing silently yields zero dimensions (the foundations entry's text-vs-raster fork, here as the lived failure mode).

- **PDF "was not created for parsing the content" — it is all about producing the desired visual result for printing.** pypdf states this directly. The corollary an expert internalizes: the absence of extractable text is not corruption, it is the format working as designed (a print target, not a data structure). The avoidance is to never assume a PDF is a database of text; always confirm a text layer before trusting decode output. [confirmed via [pypdf — Extract Text](https://pypdf.readthedocs.io/en/stable/user/extract-text.html)]

- **Whitespace and word order are NOT guaranteed: every character can be absolutely positioned, so spacing is "very hard to guarantee."** pypdf shows the content-stream reality — a run like `[(This is a )9(te)-3(st)...]` carries per-glyph kerning adjustments, so naive concatenation drops or merges spaces. The expert uses `extraction_mode="layout"` (or position-aware reassembly) when word boundaries matter, and never tokenizes raw extracted text as if whitespace were reliable. [confirmed via [pypdf — Extract Text](https://pypdf.readthedocs.io/en/stable/user/extract-text.html)]
  - *PRISM hit:* dimension/callout tokens that depend on word boundaries (a tolerance `+/-0.005` next to a nominal) can fuse or split — the corpus must preserve position, matching the foundations entry's "preserve hOCR-style position" rule.

---

## 2. The parse-discard trap — one malformed token loses the WHOLE extraction

When an extractor (or VLM) emits structured output that a strict parser then rejects, the default failure is total: the entire page/print is discarded over a single bad character. This is the most-paid-for lesson in this fleet.

- **JSON numbers REQUIRE at least one digit before the decimal point — a leading-dot decimal like `.171` is invalid JSON.** The grammar: `integer = digit | onenine digits | '-' digit | '-' onenine digits` and `fraction = "" | '.' digits` — the integer part is mandatory. So `"nominal": .171` (valid engineering shorthand) throws on `JSON.parse`. The expert's avoidance: sanitize value-position leading dots to `0.171` *before* parsing, and only in a JSON value position so a quoted string is never mangled. [confirmed via [json.org — Introducing JSON](https://www.json.org/json-en.html)]
  - *PRISM hit:* xray, 2026-06-04 — a VLM OCR'd a `.171"` dim and the whole print's extraction was discarded; fixed by `repairLeadingDotDecimals` (CLAUDE.md ## Recent regressions).

- **JSON forbids a leading `+` sign on a number (`+0.015` is invalid); `+` is only legal in an exponent.** The grammar allows `sign = "" | '+' | '-'` *only* inside `exponent`, never on the number itself. VLMs emit `+0.015` for a `±` tolerance bound. The expert strips a value-position leading `+` in the same notation-repair pass as the leading dot. [confirmed via [json.org — Introducing JSON](https://www.json.org/json-en.html)]
  - *PRISM hit:* xray, 2026-06-06 — leading-`+` plus a truncated trailing string compounded into "all models failed" on every print until the repair pass handled both.

- **A JSON string MUST be closed (`'"' characters '"'`) and a trailing comma is structurally invalid (`elements = element | element ',' elements`).** A truncated model response (unterminated trailing string, dangling comma) is therefore unparseable as-is. The expert repairs *structure first* (close the unterminated string, drop the dangling escape, balance the braces) and *then* re-applies notation repair — order matters, because notation fixes bail on a structurally broken document. [confirmed via [json.org — Introducing JSON](https://www.json.org/json-en.html)]
  - *PRISM hit:* xray, 2026-06-06 — `repairTruncatedJson` had to close the trailing string AND the fallback path had to re-run `repairLeadingDotDecimals` *after* truncation repair (structure-then-notation) or the extraction was still lost.

- **Technique decision: never let strict parsing be a single point of total loss on stochastic upstream output.** Because the source (a VLM) is non-deterministic, the *same* print intermittently produces parseable and unparseable output. The expert wraps the parse in a repair-then-retry ladder and, critically, treats "0 fields extracted" from a model that clearly produced content as a *parse* failure to recover, not a *content* failure to skip. (Engineering corollary of pypdf's "the format was not built for parsing" reality applied to model output.) [reasoning grounded in [pypdf — Extract Text](https://pypdf.readthedocs.io/en/stable/user/extract-text.html)]

---

## 3. The multi-page trap — page 0 is not the document

A corpus is multi-page documents, but many extraction loops were written against single-page samples and silently process only the first page.

- **pypdf extracts text per `page` object — a document is `reader.pages`, an iterable, and "extracting the text of a page requires parsing its whole content stream."** Each page is its own content stream; there is no implicit "read the whole doc" — you iterate pages explicitly. The expert's avoidance: rasterize/extract *every* page (with an explicit cap, logged when hit), never index `pages[0]` and assume the rest are decorative. [confirmed via [pypdf — Extract Text](https://pypdf.readthedocs.io/en/stable/user/extract-text.html)]
  - *PRISM hit:* xray, 2026-06-08 — `blueprint-ocr-training-loop.mjs` rasterized PDF page 0 only, but ~96% of JM drawing PDFs are multi-page (2-32 pp), so ~76% of dimension-bearing pages were silently dropped. Fix rasterized all pages with a logged cap (CLAUDE.md ## Recent regressions).

- **Per-page memory is a real ceiling: pypdf has "seen 10 GB RAM being required" to extract text from large files.** Parsing a whole content stream is not free; a corpus loop that holds many pages/prints in memory before writing will OOM (or be reaped under host memory pressure). The expert streams per-page output to disk and bounds in-flight pages — which dovetails with the resumability discipline below. [confirmed via [pypdf — Extract Text](https://pypdf.readthedocs.io/en/stable/user/extract-text.html)]

---

## 4. The non-resumable-corpus-burn trap — a kill at print N restarts at print 1

Corpus extraction is long-running and GPU/CPU-heavy. If the loop is not crash-safe, every interruption (a fleet reaper, an OOM, a host reboot) destroys all progress and re-burns the work — and it *looks* like progress because the run keeps starting over.

- **An operation is idempotent if "multiple calls... have the same effect on the system state as a single call," which means it "can be repeated or retried as often as necessary without causing unintended effects" — the property that makes crash recovery safe.** A re-OCR of an already-processed print must be a no-op (or skipped via a cursor), so a retried run does not redo finished work. The expert designs the per-print step to be idempotent: durable row written *before* the cursor advances, resume reads the cursor and skips done items. [confirmed via [Wikipedia — Idempotence](https://en.wikipedia.org/wiki/Idempotence)]
  - *PRISM hit:* xray, 2026-06-08 — the runner held every print in memory and `writeFileSync` ONCE at the end; a reaper kill at print N lost ALL N and restarted at 1 (a non-terminating GPU burn). Fix: per-print stream-append to trainset/queue/`processed-cursor.jsonl` (durable rows BEFORE cursor) + a resume partition; resume re-OCR = 0 (CLAUDE.md ## Recent regressions).

- **Technique decision: write the durable artifact BEFORE advancing the cursor, never the reverse.** If the cursor advances first and the crash lands before the row is written, you lose data silently AND skip it on resume — the worst combination. Ordering the side effects (append row -> then mark done) is what makes the retry idempotent in practice rather than just in theory. [reasoning grounded in [Wikipedia — Idempotence](https://en.wikipedia.org/wiki/Idempotence)]

---

## 5. The OCR-quality trap — bad input, not a bad engine, causes most "Tesseract is wrong" reports

When OCR accuracy is poor, practitioners blame the recognizer; the expert audits the *input* first, because the documented quality levers are almost all preprocessing.

- **Tesseract wants "a DPI of at least 300 dpi"; below that, recognition degrades.** A corpus rasterizing PDF pages too coarsely starves the OCR engine of pixels. The expert rasterizes to >=300 DPI (and tracks effective capital-letter height in pixels, which the docs call out as the real driver). [confirmed via [Tesseract — Improving the quality of the output](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html)]
  - *PRISM hit:* a min-DPI floor for THIS corpus is a pipeline-quality number left owner-gated for xray; the *>=300 DPI* guidance is the source-confirmed floor to start from.

- **Tesseract binarizes internally with Otsu, but "the result can be suboptimal, particularly if the page background is of uneven darkness"; v5 added Adaptive Otsu and Sauvola.** Shop scans with shadows/uneven lighting are exactly the uneven-background case. The expert pre-binarizes (adaptive threshold) when internal Otsu is "problematic," rather than feeding a raw uneven grayscale and blaming the result. [confirmed via [Tesseract — Improving the quality of the output](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html)]

- **Skew, noise, and borders silently wreck recognition: "the quality of Tesseract's line segmentation reduces significantly if a page is too skewed," noise "can make the text... more difficult to read," and big borders "can cause problems."** These are corpus-realistic conditions (a phone photo of a print, a fax-quality scan). The expert de-skews, despeckles, and crops/normalizes borders as a front-end stage — preprocessing the foundations entry names, here as the gotcha that they are *mandatory* on real scans, not optional polish. [confirmed via [Tesseract — Improving the quality of the output](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html)]

- **The wrong Page Segmentation Mode (PSM) "severely degrades results" — the default assumes a full page, and there are 14 modes (0-13) for different layouts.** Feeding a single cropped dimension cell to the full-page PSM (or a multi-column drawing to the single-block PSM) is a common silent accuracy killer. The expert selects PSM to match the cropped region's geometry — pairing layout analysis (which crops the zone) with the PSM that fits it. [confirmed via [Tesseract — Improving the quality of the output](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html)]
  - *Owner-gate:* the specific PSM/OEM value table is gated in the foundations entry; the gotcha that *mismatched PSM degrades results* is source-confirmed here.

---

## 6. The encoding trap — garbled characters from a decode mismatch, not from OCR

Not every wrong character is an OCR error. When a text-bearing document's bytes are decoded with the wrong character encoding, you get systematic, plausible-looking garble that no amount of OCR tuning fixes.

- **Mojibake is "the garbled or gibberish text that is the result of text being decoded using an unintended character encoding" — a systematic replacement of symbols with unrelated ones.** It happens when bytes encoded in one standard are decoded with another. The classic Western case: UTF-8 misread as Windows-1252/ISO-8859-1 turns `£` into `Â£`. The expert determines the encoding (from metadata/heuristics) before decoding, and recognizes systematic symbol-swap garble as an *encoding* bug to fix at decode time, not a recognition bug to retrain. [confirmed via [Wikipedia — Mojibake](https://en.wikipedia.org/wiki/Mojibake)]
  - *PRISM hit:* CLAUDE.md records the broader fleet lesson `feedback_verify_actual_contract_not_proxy` — "PS 5.1 codepage mangles non-ASCII stdout" — the same decode-with-wrong-codepage class; a corpus ingesting non-ASCII callouts (degree/diameter/plus-minus symbols) must pin the encoding or it silently mangles them.

- **Underspecification is a named root cause: "when encoding isn't specified, software must guess — often incorrectly."** A PDF/text stream without a declared encoding forces a guess, and the guess is the bug. The expert treats the document's own metadata (the PDF dictionaries the foundations entry describes) as a first-class encoding signal and fails loud on an undeterminable encoding rather than guessing into mojibake. [confirmed via [Wikipedia — Mojibake](https://en.wikipedia.org/wiki/Mojibake)]

---

## 7. The VLM-hallucination trap — a confident model invents content that was never on the page

Vision-language models are now common OCR/extraction backends, and they fail differently from classical OCR: instead of garbling a character, they *fabricate* a plausible value with full confidence.

- **AI hallucination is "a response generated by AI that contains false or misleading information presented as fact" — models "generate plausible-sounding falsehoods confidently," and vision/multimodal systems "often produce inaccurate or unexpected results."** A VLM reading a smudged dimension can invent a clean, wrong number that *looks* correct. The expert never trusts a single VLM extraction of a load-bearing value (a tolerance, a material code) without corroboration. [confirmed via [Wikipedia — Hallucination (artificial intelligence)](https://en.wikipedia.org/wiki/Hallucination_(artificial_intelligence))]
  - *PRISM hit:* the xray multi-VLM ensemble (`vision-ensemble-fuse.mjs`, CLAUDE.md ## Recent regressions, 2026-06-04) was built precisely because a single VLM hallucinates dims.

- **Mitigation is multi-model consensus + confidence-based evaluation: getting different models to agree, "assigning confidence scores to multiple possible replies," and post-processing/verification — "operationally necessary" for high-stakes domains.** The expert's avoidance: run N diverse VLM families, treat a value as corroborated only when >=2 independently agree, and flag a 1-of-N value as a hallucination candidate (corroborated vs candidate, not pass vs fail). Manufacturing dimensions are a high-stakes domain — a hallucinated tolerance becomes a scrapped part. [confirmed via [Wikipedia — Hallucination (artificial intelligence)](https://en.wikipedia.org/wiki/Hallucination_(artificial_intelligence))]
  - *Owner-gate:* the consensus quorum and confidence floor for THIS corpus are pipeline numbers left owner-gated for xray; the >=2-agree principle is source-confirmed.

---

## Owner-gate (NOT promoted)

These are deliberately left for xray to set and validate against live pdf-corpus data; they are NOT confirmed by the cited sources and must not be treated as ship gates until xray validates them:

- **Min DPI for THIS corpus's rasterization** — the >=300 DPI Tesseract floor is confirmed, but the corpus-specific DPI (some shop scans need more; some clean CAD exports need less) is owner-gated.
- **OCR/extraction confidence floor + word-error-rate ship gate** — the per-field accuracy target at which a print is "trainable vs reject" is a pipeline-quality number, owner-gated (foundations notes word-level accuracy is the right metric, not character-level; the threshold value is gated).
- **VLM ensemble quorum + per-family weighting** — the exact N, the >=2-of-N quorum vs a weighted vote, and which VLM families to run are owner-gated; only the multi-model-consensus *principle* is source-confirmed.
- **Tesseract PSM/OEM value selection per region type** — the specific PSM for a title-block vs a dimension cell vs full-drawing is owner-gated (the PSM/OEM enumeration itself is gated in the foundations entry).
- **Multi-page rasterization cap** — the page cap (foundations records a 12-page cap was used in one PRISM loop) is a tuning number, owner-gated; only "process every page, log when capped" is doctrine.
- **No physics/safety constants apply** — pdf-corpus is a document-extraction domain; there are NO cutting/Kienzle/Taylor constants to gate here (n/a). The gated items above are pipeline-quality thresholds, not safety constants.

## Sources

- https://pypdf.readthedocs.io/en/stable/user/extract-text.html (pypdf — Extract Text: text-vs-image, not-built-for-parsing, whitespace not guaranteed, layout mode, per-page iteration, 10 GB RAM caveat, route-to-OCR for image PDFs)
- https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html (Tesseract — Improving the quality of the output: >=300 DPI, Otsu/Adaptive-Otsu/Sauvola binarization, skew/noise/border degradation, 14 PSM modes 0-13, internal vs user preprocessing)
- https://www.json.org/json-en.html (json.org — JSON number grammar: mandatory integer part, no leading `+`, no trailing comma, strings must be closed)
- https://en.wikipedia.org/wiki/Hallucination_(artificial_intelligence) (AI hallucination definition, vision-model fabrication, multi-model-consensus + confidence-based mitigation)
- https://en.wikipedia.org/wiki/Idempotence (computer-science idempotence: repeat/retry without unintended effects — crash-safe corpus resume)
- https://en.wikipedia.org/wiki/Mojibake (encoding-mismatch garble: definition, underspecification root cause, UTF-8-as-Latin-1/Windows-1252 example)
