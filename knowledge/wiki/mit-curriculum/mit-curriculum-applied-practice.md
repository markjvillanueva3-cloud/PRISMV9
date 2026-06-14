---
title: MIT Curriculum Applied Practice — OCW corpus-ingestion gotchas, licensing failure modes, and the technique decisions theory does not teach
galaxy: mit-curriculum
owner_slot: lima
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice-meta (2026-06-10)"
verification_method: each practitioner claim WebFetch-confirmed against a primary/legal free source (Creative Commons FAQ + CC wiki best-practices + CC wiki NonCommercial-interpretation, MIT OCW terms-of-use, Wikipedia MIT-OCW history, Wikipedia OCR). CС/OCW license + corpus facts are CONFIRMED; benchmark-specific extraction-accuracy numbers for PRISM's own corpus are left owner-gated. Theory (license-element definitions, catalog structure, GIR scaffold) is NOT re-derived here — it lives in mit-curriculum-foundations.md.
tags: [mit-curriculum, applied-practice, tribal-knowledge, opencourseware, ocw, creative-commons, cc-by-nc-sa, noncommercial, sharealike, attribution, license-compatibility, link-rot, course-version-drift, transcript-desync, ocr, scanned-pdf, oer, gotchas, failure-modes]
---

# MIT Curriculum Applied Practice

The **practitioner-knowledge** layer for the **mit-curriculum** galaxy (owner: lima): the hard-won gotchas, failure modes, and technique decisions that come from actually *ingesting* MIT OpenCourseWare into a corpus — not the theory of what OCW is. The theory layer (what OCW is, the catalog structure, the CC BY-NC-SA license elements, the GIR prerequisite scaffold) is in **[`mit-curriculum-foundations.md`](mit-curriculum-foundations.md)** and is deliberately NOT repeated here. This entry is "what goes wrong when you turn the corpus into PRISM academy content, and how an expert avoids it."

> **Scope discipline.** Foundations answers *what is the source and what does its license say*. This entry answers *where does an ingestion pipeline silently break, and what does the expert do differently*. If you find yourself re-explaining the BY/NC/SA clauses, you are in the wrong file.

**Honesty note (R12):** every gotcha below is WebFetch-confirmed against a cited free/legal source. Where the avoidance technique depends on a PRISM-specific number (extraction accuracy on our own scanned corpus, exact live course counts), that number is left to lima's owner-gate, not asserted here.

---

## 1. The licensing failure modes (the gotchas that get you sued, not just wrong)

These are corpus-ingestion mistakes that look harmless in code review but are legal violations. The CC license text is in foundations; here is where reusers actually trip.

- **Gotcha — attributing "Creative Commons" instead of the author is the single most common attribution error.** WHY: reusers see the CC logo and credit the license body, when the BY clause requires crediting *the licensor* (MIT / the named instructor). The CC best-practices guide lists "Crediting Creative Commons instead of the author" as "a frequent error," alongside "Crediting the hosting site rather than the author." EXPERT AVOIDANCE: store the full **TASL tuple — Title, Author, Source-URL, License-URL** — per ingested artifact and render all four as hyperlinks; the canonical good example is `"<Title> by <Author> is licensed under <CC license linked>"`. (CC wiki: Best practices for attribution.) → PRISM hit: every academy lesson derived from an OCW course must carry the OCW course's instructor + course-page URL + the CC BY-NC-SA 4.0 deed link, NOT a bare "source: MIT OCW."

- **Gotcha — attribution in metadata only is invisible and does not satisfy BY.** WHY: a pipeline that stamps the source into EXIF/JSON sidecars but renders nothing to the human reader has technically failed the "give appropriate credit" requirement; CC explicitly flags "Metadata-only attribution — placing credits only in EXIF data, invisible to most users" as a mistake. EXPERT AVOIDANCE: render the attribution in the visible artifact (footer/caption), not just the record. (CC wiki: Best practices for attribution.) → PRISM hit: a lesson card's source must appear in the rendered card, not only in the lesson's backing JSON.

- **Gotcha — "indicate if changes were made" is forgotten when PRISM adapts vs quotes.** WHY: BY requires you to flag modification; an adaptation pipeline that paraphrases/reorders OCW lecture notes without an "adapted from / modified" note has silently dropped a required element. CC lists "Missing modifications disclosure — failing to note when you've adapted the work" as a mistake. EXPERT AVOIDANCE: tag each derived artifact `verbatim` vs `adapted` and emit "Adapted from ..." for the latter. (CC wiki: Best practices for attribution.) → PRISM hit: the academy `{verbatim|adapted}` flag is a license-compliance field, not a nicety.

- **Gotcha — NonCommercial is a judgment call, not a boolean, and the gray zone is where PRISM lives.** WHY: NC means "**not primarily intended for or directed towards commercial advantage or monetary compensation**" — the word "primarily" is deliberate because CC says "Narrowly or exhaustively attempting to prescribe every permitted and prohibited activity is an impossible task." Concretely: a for-profit university *linking* to NC courseware on a paywalled site is permitted (linking needs no copyright permission), but "Including an NC essay in a commercially distributed book collection" is prohibited. EXPERT AVOIDANCE: treat NC as a per-surface decision and never assume a use is clean because it is internal — the test is the *intent/direction* toward commercial advantage. (CC wiki: NonCommercial interpretation.) → PRISM hit: OCW-derived academy content shipped into any paid/marketed PRISM surface is the prohibited-collection case, not the permitted-link case — see owner-gate.

- **Gotcha — MIT's own terms forbid more than the bare CC license does.** WHY: OCW's terms-of-use state "**Users may not sell, profit from, or commercialize OCW materials or works derived from them**" and separately "**You may not use MIT's names or logos, or any variations thereof, without prior written consent**." A team that reads only the CC deed misses the trademark restriction entirely. EXPERT AVOIDANCE: read the *publisher's* terms-of-use in addition to the CC deed; never put "MIT" in a product/marketing name on the strength of CC BY alone. (ocw.mit.edu terms of use.) → PRISM hit: a PRISM academy module may cite "from MIT 2.854" as attribution but must not brand itself as an "MIT course."

- **Gotcha — not all bytes on an OCW page are under the CC license; third-party material is carved out.** WHY: OCW terms note "You do not have to comply with the license for elements of the material in the public domain or where your use is permitted by an applicable exception or limitation" — the inverse hazard is that *embedded third-party content* (a copyrighted figure, a textbook excerpt) may not be MIT's to relicense. EXPERT AVOIDANCE: do not assume a whole course page is uniformly CC BY-NC-SA; flag embedded figures/quotes for separate review. (ocw.mit.edu terms of use.) → PRISM hit: bulk-harvesting a course page's images into the corpus can pull in non-CC third-party content.

---

## 2. ShareAlike + license-compatibility (the contamination you cannot undo later)

- **Gotcha — CC licenses are irrevocable, so a bad ingestion decision is permanent for distributed copies.** WHY: "CC licenses are not revocable. Once something has been published under a CC license, licensees may continue using it." If PRISM publishes a derivative under the wrong license, it cannot claw that back from anyone who already has a copy. EXPERT AVOIDANCE: decide the derivative's license *before* first publication, not after; an irreversible grant deserves a deliberate gate, not a default. (CC FAQ.) → PRISM hit: the academy publish step is a one-way licensing door — get the SA decision right pre-publish.

- **Gotcha — ShareAlike forces your derivative's license, and combining versions/ports is not automatically compatible.** WHY: under SA an adaptation of OCW (CC BY-NC-SA 4.0) must itself be CC BY-NC-SA — but if you remix multiple open sources, "A modified license very likely will not be compatible with the same CC license (unmodified)," and different CC versions/ports must be checked "case-by-case." EXPERT AVOIDANCE: prefer **quoting-with-attribution (no SA obligation) over remixing (triggers SA)** when you only need to cite; if you must remix, keep all sources on the same license version (4.0, "drafted to be internationally valid") and consult the BY-SA compatibility list. (CC FAQ.) → PRISM hit: a lesson that *quotes* OCW + a differently-licensed source is fine; a lesson that *blends* them inherits the strictest SA obligation and a compatibility check.

- **Gotcha — you cannot relicense content you do not hold rights to.** WHY: CC is explicit — "You should not apply a license to material that you do not own or that you are not authorized to license." A pipeline that stamps a uniform PRISM license over a mixed corpus is over-claiming rights. EXPERT AVOIDANCE: license per-source, tracking provenance to the original rights-holder; never blanket-stamp. (CC FAQ.) → PRISM hit: the corpus-aggregation layer must preserve per-document license provenance, not collapse everything to one PRISM license header.

---

## 3. Course-version drift + withdrawal (the citations that rot under you)

- **Gotcha — the same MIT subject number is republished across terms, so a citation must pin the term or it points at the wrong content.** WHY: foundations' own exemplar is "2.854 ... Fall 2016" — the term is part of the identity because MIT re-offers subjects across years with different instructors/notes; OCW even ships purpose-built re-sequenced variants ("In 2011, MIT OpenCourseWare introduced the first of fifteen **OCW Scholar courses** ... designed specifically for the needs of independent learners"). A citation to bare "2.854" silently drifts to whichever offering. EXPERT AVOIDANCE: key every ingested record on `{course_number, term, instructor}` — never the number alone. (Wikipedia: MIT OpenCourseWare; foundations §6.) → PRISM hit: the academy corpus record must carry `term` as part of the primary key, or a re-fetch can quietly swap the source out from under a lesson.

- **Gotcha — a course can be revised or withdrawn, breaking a stored deep-link with no error.** WHY: a withdrawn/redesigned course page returns 404 (we hit several OCW 404s building *this very entry*), and a stored URL gives no signal it has gone stale. EXPERT AVOIDANCE: store the citation's full TASL metadata (title/author/term) so the source is identifiable even when the URL dies, and run a periodic link-health check on stored OCW URLs rather than trusting them indefinitely. → PRISM hit: foundations already owner-gates the bulk-data path; the live consequence is that any hardcoded OCW course URL is a future dead link — re-validate before a module depends on it.

- **Gotcha — platform migrations silently invalidate old links and embeds.** WHY: OCW's delivery substrate has changed repeatedly — the custom CMS was "replaced in mid-2010 with a Plone-based content management system" and "In 2008, OCW transitioned to using YouTube as the primary digital video streaming platform." Each migration is a class of link/embed breakage. EXPERT AVOIDANCE: never assume a deep-link's path structure is stable across years; resolve from the current catalog at fetch time rather than reconstructing old-format URLs. (Wikipedia: MIT OpenCourseWare.) → PRISM hit: a harvester that builds OCW URLs by string-templating an old path scheme will break at the next platform migration — resolve from the live catalog.

---

## 4. Transcript / video / format coverage gaps (the corpus is not uniform)

- **Gotcha — most OCW courses do NOT have complete video, so a video-transcript pipeline silently under-covers the corpus.** WHY: "As of May 2018, 100 courses included complete video lectures" out of 2,400+ — and many courses were "limited to chronological reading lists" while "a majority provided homework problems and exams ... and lecture notes." A pipeline keyed on video transcripts harvests a small minority; the majority of the knowledge is in lecture-note PDFs. EXPERT AVOIDANCE: make **lecture notes the primary extraction target** (foundations §6 confirms "lecture notes are the primary resource type"), with video transcripts as an additive layer for the minority that have them — do not gate ingestion on video existing. (Wikipedia: MIT OpenCourseWare; foundations §6.) → PRISM hit: an academy lesson that requires a video transcript will be empty for ~96% of courses; route from lecture notes first.

- **Gotcha — transcript-vs-video desync: a transcript can exist without the matching video being current, and vice versa.** WHY: video moved to YouTube (2008) on a different lifecycle from the course page; a course's transcript text and its embedded video are maintained on separate substrates that drift. EXPERT AVOIDANCE: treat transcript text as the citable artifact (it is the stable, extractable text) and treat the video embed as a best-effort pointer that may 404 independently. (Wikipedia: MIT OpenCourseWare.) → PRISM hit: store the transcript content, not just a video link, so a lesson survives the video going dark.

---

## 5. Extraction quality — scanned PDF vs born-digital (the silent garbage-in)

- **Gotcha — OCR of a scanned PDF is 81-99% accurate at best and degrades hard on real documents, so unverified OCR text poisons the corpus.** WHY: typewritten Latin OCR accuracy "varied from 81% to 99%" depending on quality; even "neat, clean hand-printed characters ... still translates to dozens of errors per page." A 95%-accurate page still corrupts 1-in-20 characters — fatal for a course number, a constant, or a formula. EXPERT AVOIDANCE: prefer **born-digital text extraction over OCR whenever the PDF has an embedded text layer** (born-digital text is exact; OCR is a lossy estimate), and OCR only as a fallback for image-only scans. (Wikipedia: Optical character recognition.) → PRISM hit: an OCW lecture-note PDF that is born-digital must be text-extracted, never OCR'd — re-OCRing born-digital text injects errors that were not in the source.

- **Gotcha — multi-column layouts, tables, and equations are exactly where OCR fails, and academic notes are full of all three.** WHY: CC/OCR practice notes "Layout analysis or zoning" is "especially important in multi-column layouts and tables," and scientific lecture notes are dense with both plus mathematical notation that OCR mis-zones. EXPERT AVOIDANCE: validate extracted tables/equations against the layout (zone-aware extraction), and flag low-confidence equation regions for human/owner review rather than ingesting them as plain text. (Wikipedia: Optical character recognition.) → PRISM hit: a Course-18 (math) or Course-2 (manufacturing-physics) note's formulas are the highest-value AND highest-error content — extraction confidence on equations should gate, not silently flow into a physics-bearing lesson.

- **Gotcha — skew and resolution silently degrade scans before recognition even starts.** WHY: OCR pre-processing exists *because* "De-skewing" and resolution correction are "frequent quality issues in scanned documents" — a skewed or low-DPI scan caps achievable accuracy regardless of the recognizer. EXPERT AVOIDANCE: detect scan quality (resolution, skew) up front and reject/queue poor scans rather than feeding them to OCR and trusting the output. (Wikipedia: Optical character recognition.) → PRISM hit: the corpus-ingestion step should record per-document scan-quality + extraction-method (`born-digital` vs `ocr`) so downstream consumers know how much to trust the text.

---

## Owner-gate (NOT promoted)

These need lima's domain check / an operator decision before any academy module or commercial surface relies on them:

- **[lima-gate] NC application to PRISM's business model.** Section 1 confirms the NC *test* ("not primarily intended for...commercial advantage") and that MIT's terms forbid selling/commercializing derivatives — but whether a specific PRISM academy surface crosses that line is a **legal call, not a code call**. Do NOT ship OCW-derived content into a paid/marketed PRISM surface without explicit operator + legal sign-off. (Mirrors foundations' NC owner-gate; restated here because the ingestion pipeline is where the violation is committed.)
- **[lima-gate] PRISM-corpus OCR accuracy + born-digital coverage numbers.** The 81-99% OCR range is the general literature; the *actual* extraction accuracy on PRISM's ingested OCW PDFs, and what fraction of the ingested corpus is born-digital vs scanned, are PRISM-specific benchmarks lima must measure — they are not asserted here.
- **[lima-gate] Equation-extraction confidence threshold.** The gotcha that formulas are the highest-error region is confirmed; the numeric confidence threshold at which an extracted equation gates a physics-bearing lesson (vs flows through) is an owner/operator calibration, not a literature constant.
- **[lima-gate] Periodic OCW link-health + term-pin re-validation cadence.** Section 3 establishes that links rot and terms drift; the cadence at which PRISM re-validates stored OCW URLs and re-pins course terms is an operational decision for lima.

## Sources

Distinct URLs WebFetch-confirmed for this entry (2026-06-10):
1. https://creativecommons.org/faq/ — NC ambiguity + commercial workaround, SA derivative-licensing, license irrevocability, version/port compatibility, cannot-license-what-you-do-not-own (Creative Commons official FAQ)
2. https://wiki.creativecommons.org/wiki/Best_practices_for_attribution — TASL elements + the common attribution mistakes (credit-CC-not-author, omit-source, vague-license, missing-modifications, metadata-only) (Creative Commons wiki)
3. https://wiki.creativecommons.org/wiki/NonCommercial_interpretation — NC = "not primarily intended for...commercial advantage"; permitted-link vs prohibited-commercial-collection examples (Creative Commons wiki)
4. https://ocw.mit.edu/pages/privacy-and-terms-of-use/ — "may not sell, profit from, or commercialize"; MIT name/logo restriction; public-domain/third-party carve-out (MIT OCW terms of use, free courseware)
5. https://en.wikipedia.org/wiki/MIT_OpenCourseWare — OCW Scholar re-sequenced variants (2011); CMS migration mid-2010 + YouTube 2008; only 100 of 2,400+ courses with complete video as of May 2018; lecture-notes-majority coverage (reputable encyclopedic source)
6. https://en.wikipedia.org/wiki/Optical_character_recognition — 81-99% typewritten OCR accuracy, degradation factors, multi-column/table/skew/resolution failure modes (reputable encyclopedic source)

**See also:** [`mit-curriculum-foundations.md`](mit-curriculum-foundations.md) — the theory layer (OCW corpus definition, CC license elements, catalog structure, GIR prerequisite scaffold). This applied-practice entry assumes that theory and does not repeat it.
