---
title: Knowledge-Conversion Applied Practice — NLP/extraction/ETL practitioner gotchas + failure modes
galaxy: knowledge-conversion
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice-meta (2026-06-10)"
verification_method: practitioner gotchas WebFetch-confirmed against free academic + reference sources (NLTK "Natural Language Processing with Python" ch.7, CC-licensed free textbook; Wikipedia reference articles for named-entity recognition, precision-and-recall, ontology, ETL, mojibake/encoding, record linkage). Each gotcha quotes the confirmed source inline and maps to how the knowledge-conversion galaxy hits it. SLP3 IE-chapter PDF and the Distant_supervision article failed to render/resolve via WebFetch and were dropped per R12 (see Sources). Benchmark-specific numbers left owner-gated.
tags: [knowledge-conversion, applied-practice, tribal-knowledge, NER, relation-extraction, ETL, ontology-drift, encoding, mojibake, record-linkage, dedup, precision-recall, failure-modes, NLTK]
---

# Knowledge-Conversion Applied Practice

The **practitioner-knowledge** layer for the knowledge-conversion galaxy: the hard-won NLP/extraction/ETL gotchas, failure modes, and technique decisions that the theory entry ([[knowledge-conversion-foundations]]) does not teach. Foundations covers *what the IE/KR/ETL pipeline is*; this entry covers *what goes wrong when you actually run one over a real manufacturing corpus, and how an expert avoids it*.

Read foundations first — it is not repeated here. Every gotcha below: the failure + WHY it happens + the expert's avoidance, with the confirmed source cited inline, then one line mapping it onto how THIS galaxy (MIT-OCW transcripts, the engine monolith, tribal tips, the PDF corpus -> wiki/memory/tribal/graph nodes) hits it.

---

## 1. NER brittleness — the extractor that works in the demo and dies on your domain

### Gotcha 1.1 — NER trained on one domain is brittle on another
**WHY it bites:** A named-entity model fit to news/Wikipedia text inherits that genre's distribution; a manufacturing transcript ("face the part on the VF-2 with a 1/2 EM, watch for chatter at the FA-S corner") is a different language. **CONFIRMED** ([Wikipedia, Named-entity recognition](https://en.wikipedia.org/wiki/Named-entity_recognition)): "research indicated that even state-of-the-art NER systems were brittle, meaning that NER systems developed for one domain did not typically perform well on other domains" and "Considerable effort is involved in tuning NER systems to perform well in a new domain; this is true for both rule-based and trainable statistical systems."
**Expert avoidance:** budget explicit domain adaptation — never assume an off-the-shelf NER carries over; tune/fine-tune on in-domain text and measure on in-domain held-out data, not the model's published benchmark.
**Galaxy hit:** PRISM's source entities (a tool, a material, a controller dialect, an alarm code, a machine like VMC-03) are exactly the domain-specific types a generic NER mis-handles — treat any extractor's accuracy on JM-Die text as unknown until measured.

### Gotcha 1.2 — gazetteer/name-list lookup is error-prone and has poor coverage
**WHY it bites:** the tempting shortcut is "match every token against a list of known names." But entity names are ambiguous and lists rot. **CONFIRMED** ([NLTK book, ch.7 "Extracting Information from Text"](https://www.nltk.org/book/ch07.html)): "Looking up every word in a gazetteer is error-prone" — it "incorrectly finds locations like Sanchez ... and On ..."; "Any list of such names will probably have poor coverage. New organizations come into existence every day"; and "many named entity terms are ambiguous" (e.g. "Christian Dior looks like a PERSON but is more likely to be of type ORGANIZATION").
**Expert avoidance:** use list lookup only as one feature among context features, never as the sole decision; account for coverage decay (the list is stale the day you ship it) and disambiguate by surrounding context, not by membership alone.
**Galaxy hit:** a fixed list of "known engine names" or "known materials" will both over-fire (a common English word that is also a part name) and under-fire (a new engine/material added after the list froze) — the same staleness the foundations entry's ontology section warns about.

### Gotcha 1.3 — exact-span F1 punishes "almost right" as total failure
**WHY it bites:** a multi-token entity ("Cecil H. Green Library") that the extractor gets off by one token scores as a *complete miss* under standard scoring, so headline F1 looks worse than the model "feels." **CONFIRMED** ([Wikipedia, Named-entity recognition](https://en.wikipedia.org/wiki/Named-entity_recognition)): "NER can fail in many other ways, many of which are arguably 'partially correct', and should not be counted as complete success or failures"; and "Any prediction that misses a single token, includes a spurious token, or has the wrong class, is a hard error and does not contribute positively to either precision or recall." It also warns token-level accuracy is misleading because "the vast majority of tokens in real-world text are not part of entity names" and "mispredicting the full span of an entity name is not properly penalized."
**Expert avoidance:** report exact-span precision/recall/F1 (the honest, harsh metric) AND inspect partial-match errors separately so a boundary-off model is not confused with a class-wrong one; never report token-level accuracy as if it were entity accuracy.
**Galaxy hit:** this is the honest yardstick for grading any conversion lane's extractor — it is the R12 antidote to "looks fine"; the foundations entry names exact-span F1 as the metric, and this is why it reads pessimistically.

### Gotcha 1.4 — noisy/informal text breaks orthographic cues
**WHY it bites:** NER leans on capitalization and standard spelling; short, informal, non-standard text removes those cues. **CONFIRMED** ([Wikipedia, Named-entity recognition](https://en.wikipedia.org/wiki/Named-entity_recognition)): applying NER "to Twitter and other microblogs" remains challenging because they are "'noisy' due to non-standard orthography, shortness and informality of texts."
**Expert avoidance:** expect degraded NER on informal sources; normalize/repair text first, or use models trained on noisy text, and lower your confidence in any entity pulled from a terse, ALL-CAPS, or abbreviation-dense fragment.
**Galaxy hit:** shop-floor tribal tips and OCR'd print annotations are PRISM's "microblog" equivalent — terse, abbreviation-heavy, inconsistently cased — so the extractor that does fine on a clean MIT-OCW transcript will under-perform on a one-line tribal note.

---

## 2. Relation extraction — precision vs recall, and the false positives nobody filters

### Gotcha 2.1 — precision and recall trade against each other; you cannot maximize both
**WHY it bites:** the naive instinct is to "extract more relations" (helps recall) or "only extract sure things" (helps precision) without realizing it is a single dial. **CONFIRMED** ([Wikipedia, Precision and recall](https://en.wikipedia.org/wiki/Precision_and_recall)): precision is "the fraction of relevant instances among the retrieved instances" and recall "the fraction of relevant instances that were retrieved"; crucially "it is possible to have perfect recall by simply retrieving every single item" and "Often, there is an inverse relationship between precision and recall, where it is possible to increase one at the cost of reducing the other." The honest single number is the harmonic mean F = 2*(precision*recall)/(precision+recall).
**Expert avoidance:** decide the operating point *deliberately* per use — a knowledge base that feeds automated reasoning wants high precision (a wrong edge poisons inference) even at recall cost; report F1 so a recall-padded extractor cannot hide behind "it found a lot."
**Galaxy hit:** a converted edge that is *wrong* is worse than one that is *missing* — the cross-substrate edge spine feeds the GNN reasoning tier, so the galaxy should sit at the high-precision end and treat low recall as a backlog, not a defect.

### Gotcha 2.2 — pattern/rule-based relation extraction silently retrieves false positives
**WHY it bites:** a tag-pattern or string template that "links two nearby entities" will also link two entities that happen to co-occur without the relation, and there is no easy lexical filter to catch it. **CONFIRMED** ([NLTK book, ch.7](https://www.nltk.org/book/ch07.html)): pattern-based extraction "will also retrieve false positives" (it shows a spurious link involving "House Transportation Committee" with a location), and "there is unlikely to be [a] simple string-based method of excluding filler strings."
**Expert avoidance:** never trust a co-occurrence pattern as a relation assertion; require a syntactic/dependency path between the two entities (the head-dependent path is the standard relation signal per foundations Ch.19->Ch.20), and hold out a labeled sample to *measure* the false-positive rate rather than eyeballing examples.
**Galaxy hit:** "this tip mentions a tool and a machine, so tip *applies-to* machine" is precisely the co-occurrence trap — two entities in the same sentence does not mean the relation holds; a typed PRISM edge minted from raw proximity is a false positive waiting to mislead the GNN.

### Gotcha 2.3 — the cascade pipeline compounds upstream errors
**WHY it bites:** relation extraction takes NER output as input, so an NER boundary error or missed entity removes a relation that could never be recovered downstream. **CONFIRMED** ([NLTK book, ch.7](https://www.nltk.org/book/ch07.html)): the IE architecture is a strict sequence (sentence segmentation -> tokenization -> POS tagging -> NER -> relation extraction) where "entity recognition" is a prerequisite for relation detection — "first the entities, then search for patterns connecting them," so an entity the NER stage missed is invisible to every later stage.
**Expert avoidance:** measure each stage end-to-end (the relation extractor's *real* recall is bounded by the NER's recall), and when a relation is mysteriously missing, debug the upstream stage first — do not tune the relation patterns to compensate for a NER miss.
**Galaxy hit:** R13's logical-order mandate is the same lesson — build/verify the entity-recognition stage on a proven foundation before the relation stage; a conversion lane that emits zero edges for a source may have an extractor that is fine and an entity stage that is blind.

---

## 3. ETL silent-drop — the malformed record that vanishes without a trace

### Gotcha 3.1 — validation outcomes are undefined-by-default; records can be dropped silently
**WHY it bites:** the dangerous default is "the transform handled it" without knowing *how*. **CONFIRMED** ([Wikipedia, Extract, transform, load](https://en.wikipedia.org/wiki/Extract,_transform,_load)): "If the data fails the validation rules, it is rejected entirely or in part. The rejected data is ideally reported back to the source system for further analysis," and for the Transform phase: "Failed validation may result in a full rejection of the data, partial rejection, or no rejection at all, and thus none, some, or all of the data is handed over to the next step depending on the rule design and exception handling."
**Expert avoidance:** make rejection *loud and counted* — every dropped/partially-dropped record goes to a reject channel with a reason, and the run reports "loaded N of M, dropped K" so a 30-skipped-records run can never masquerade as success. This is the R12 fail-loud rule expressed in ETL terms.
**Galaxy hit:** a conversion run that ingests 7,794 source documents and emits nodes for 7,400 must *say so* — silently dropping 394 malformed sources is the exact "migration completed" lie R12 names, and PRISM has been bitten by fail-OPEN catches that returned empty instead of failing loud (see CLAUDE.md "Recent regressions": the tribal-brain clobbers).

### Gotcha 3.2 — an unknown code/value raises a transform exception you must design for
**WHY it bites:** the transform stage maps source values to target schema; the *first* value not in your map is an exception, and unhandled it either crashes the batch or (worse) is swallowed. **CONFIRMED** ([Wikipedia, ETL](https://en.wikipedia.org/wiki/Extract,_transform,_load)): "many of the above transformations may result in exceptions, e.g., when a code translation parses an unknown code in the extracted data," and the cleansing function "aims to pass only 'proper' data to the target."
**Expert avoidance:** anticipate the unknown-code case by design (route to a quarantine/staging area for review, with an audit trail), not as an afterthought; "history and audit trail of all changes" is what lets you recover and re-process.
**Galaxy hit:** a new source genre (a controller dialect or material the node-shaping map has never seen) is the unknown-code case — the conversion lane should quarantine it for golf to map, not coerce it into the nearest existing node-kind; this is why conversion lands in a staging surface before atomic merge (foundations §6).

---

## 4. Encoding & unicode — the corruption that reads fine in English and lies in punctuation

### Gotcha 4.1 — mojibake: text decoded with the wrong encoding is silently garbled
**WHY it bites:** the bytes are written with one encoding (UTF-8) and read with another (Latin-1/Windows-1252 or a Windows code page); nothing errors, the text just becomes subtly wrong. **CONFIRMED** ([Wikipedia, Mojibake](https://en.wikipedia.org/wiki/Mojibake)): mojibake is "the garbled or gibberish text that is the result of text being decoded using an unintended character encoding," caused by encoding mismatch — "underspecification" (encoding not tagged), "mis-specification" (wrong encoding declared), and system defaults differing across machines, especially "protocols that rely on settings on each computer rather than sending or storing metadata together with the data."
**Expert avoidance:** declare and carry the encoding with the data (default to UTF-8 end-to-end), never rely on the reader's locale default; validate that round-tripped text is byte-equal to the source rather than "looks readable."
**Galaxy hit:** PRISM's own corpora cross drives and toolchains (the C:->H: mirror, PowerShell 5.1 codepage mangling non-ASCII stdout — see memory `verify_actual_contract_not_proxy`); a converted node whose degree symbol, fraction, or accented vendor name got mojibake'd reads fine to a skim but is wrong data.

### Gotcha 4.2 — the corruption hides because ASCII English survives it
**WHY it bites:** most encodings agree with ASCII, so the body of English text looks perfect while only punctuation/diacritics corrupt — creating a false sense of correctness. **CONFIRMED** ([Wikipedia, Mojibake](https://en.wikipedia.org/wiki/Mojibake)): "mojibake in English texts generally occurs in punctuation ... but rarely in character text, since most encodings agree with ASCII on the encoding of the English alphabet" — the selective corruption makes detection difficult.
**Expert avoidance:** explicitly test on non-ASCII content (curly quotes, em-dashes, micrometres µm, °, accented names) — an "all-ASCII looks fine" smoke test will pass while real data corrupts; PRISM's own ASCII-in-code discipline (this entry's body is markdown, code is ASCII) is the conservative defense.
**Galaxy hit:** dimension/tolerance text (Ø, ±, °, µm) and Polish/Spanish operator names (per memory `jm_die_shop_floor_languages`) are exactly the non-ASCII content that mojibake silently mangles — an extractor that "passed" on an English transcript can corrupt a metric drawing's tolerances.

---

## 5. Ontology drift & dedup over-merge — the slow rot and the wrong-merge

### Gotcha 5.1 — ontology currency: a frozen vocabulary drifts out of the domain
**WHY it bites:** the domain keeps moving (new tools, new materials, renamed engines) but the controlled vocabulary does not update itself; an unmaintained ontology slowly stops describing reality. **CONFIRMED** ([Wikipedia, Ontology (information science)](https://en.wikipedia.org/wiki/Ontology_(information_science))): a documented challenge is "Ensuring the ontology is current with domain knowledge and term use," and "Building ontologies manually is extremely labor-intensive and time-consuming."
**Expert avoidance:** treat the ontology as a living artifact with an owner and a review cadence; version it, and detect drift (terms appearing in sources that have no ontology class) as a maintenance signal rather than coercing new terms into stale classes.
**Galaxy hit:** PRISM's typed-edge whitelist + node-kind schema *is* the galaxy's ontology (foundations §5); it must be owner-maintained (golf/sierra) or it drifts — and the foundations entry deliberately owner-gates the canonical node ontology for exactly this reason.

### Gotcha 5.2 — merging two ontologies of the same domain is largely manual and they are often incompatible
**WHY it bites:** two extraction passes (or two source corpora) can model the same concept differently, and reconciling them is not automatic. **CONFIRMED** ([Wikipedia, Ontology (information science)](https://en.wikipedia.org/wiki/Ontology_(information_science))): "Since domain ontologies are written by different people, they represent concepts in very specific and unique ways, and are often incompatible within the same project," and "merging ontologies that are not developed from a common upper ontology is a largely manual process and therefore time-consuming and expensive."
**Expert avoidance:** anchor all extraction to ONE shared upper schema from the start (a common node-kind/edge-type whitelist) so divergent passes are comparable — retro-fitting a merge between two incompatible schemas is the expensive failure mode.
**Galaxy hit:** every conversion lane (A/B/C) must emit against the SAME cross-substrate edge whitelist, not its own ad-hoc labels — this is why the foundations entry grounds the typed whitelist as the shared "specification of a conceptualization"; divergent per-lane vocabularies would force the manual merge this gotcha warns is costly.

### Gotcha 5.3 — dedup/record-linkage over-merge collapses two distinct entities into one
**WHY it bites:** the match threshold is a precision/recall dial: set it loose to catch all duplicates and you *also* link records that are genuinely different entities, fusing two distinct nodes into one. **CONFIRMED** ([Wikipedia, Record linkage](https://en.wikipedia.org/wiki/Record_linkage)): "Record pairs with probabilities above a certain threshold are considered to be matches" and the threshold "is a balancing act between obtaining an acceptable sensitivity (or recall) and positive predictive value (or precision)"; blocking "increasing the positive predictive value (precision) at the expense of sensitivity (recall)." It also warns errors compound: "linkage errors propagate into the linked data and its analysis."
**Expert avoidance:** prefer a conservative (high-precision) match threshold for *merging* — an over-merge that collapses two real entities is far costlier than a missed merge that leaves a harmless near-duplicate, and it propagates into everything downstream that reads the fused node; require discriminating keys to agree before merging, and review borderline matches rather than auto-fusing.
**Galaxy hit:** PRISM's `duplicationGuardEngine` (THROWS on duplicate) is the *anti*-create guard; the symmetric danger at conversion time is over-merging two distinct extracted nodes (two different engines that share a keyword) into one — bias the linkage toward NOT merging when uncertain, because a fused node poisons the master-index and the GNN that read it.

---

## Owner-gate (NOT promoted)

The following are deliberately left for golf (galaxy owner) to measure/bind against PRISM's actual corpora + code — they are not WebFetch-confirmable institutional facts and must not be fabricated:

- **The per-lane / per-source-genre extraction precision-recall-F1 numbers** — section 2 gives the *metric and the tradeoff*; the actual operating point and measured F1 on PRISM's MIT-OCW / monolith / tribal / PDF corpora are owner-measured, never assumed (the SLP3 IE chapter, which carries the canonical bootstrapping-drift and distant-supervision-noise treatment, would not render via WebFetch — see Sources — so those specific quantified claims are deliberately omitted here rather than fabricated).
- **The match keys + merge threshold for converted-node dedup** — section 5.3 gives the over-merge failure mode and the conservative-threshold rule; the concrete discriminating keys and probability cutoff are owned by `duplicationGuardEngine` + the master-index, not this entry.
- **The ontology review cadence + drift-detection thresholds** — section 5.1/5.2 grounds *why* the ontology must be maintained and anchored to one upper schema; the actual cadence, the canonical node-kind/edge-type schema, and the drift alarm thresholds live in the cross-substrate edge spine + system-viz node-card schema (golf/sierra), and should be cross-checked there, not re-derived.
- **The encoding-validation gate config** — section 4 gives the mojibake failure mode and the byte-equal round-trip defense; the concrete normalization rules and which corpora carry non-ASCII metrology/name content are owner-bound to the conversion-lane code.

## Sources

> Each URL below was WebFetched + confirmed while writing this entry (2026-06-10). Free college-course / free-textbook sources are prioritized per the domain mandate; the reference articles supply the canonical, citable statements of each practitioner failure mode.

**Free textbook / courseware (1):**
- **Bird, Klein & Loper — "Natural Language Processing with Python", ch.7 "Extracting Information from Text" (NLTK book, CC BY-NC-ND)** (free textbook) — https://www.nltk.org/book/ch07.html

**Reference articles (canonical failure-mode statements) (6):**
- **Named-entity recognition** (domain brittleness, exact-span F1 harshness, noisy-text challenge) — https://en.wikipedia.org/wiki/Named-entity_recognition
- **Precision and recall** (inverse tradeoff, F-measure harmonic mean) — https://en.wikipedia.org/wiki/Precision_and_recall
- **Extract, transform, load** (validation rejection / silent-drop, unknown-code exception, audit trail) — https://en.wikipedia.org/wiki/Extract,_transform,_load
- **Mojibake** (encoding-mismatch corruption, ASCII-survives-so-it-hides) — https://en.wikipedia.org/wiki/Mojibake
- **Ontology (information science)** (currency/drift, manual incompatible merge) — https://en.wikipedia.org/wiki/Ontology_(information_science)
- **Record linkage** (over-merge precision/recall threshold, error propagation) — https://en.wikipedia.org/wiki/Record_linkage

> Not promoted (fetch failed / dropped per R12): Jurafsky & Martin SLP3 Information-Extraction chapter PDFs (slp3/20.pdf, slp3/21.pdf) returned binary/compressed content WebFetch could not render to text on two attempts — so the bootstrapping "semantic drift" and distant-supervision noisy-label quotes were NOT used (the precision/recall tradeoff is instead grounded via the Precision-and-recall article, and RE false positives via the NLTK book). Wikipedia "Distant supervision" returned HTTP 404 on two attempts and was dropped.

## Cross-refs
- Theory companion: [[knowledge-conversion-foundations]] (IE pipeline, NER/RE definitions, KR, ontology theory, ETL phases)
- Galaxy brain: `mcp-server/src/engines/knowledge-conversion/MEMORY.md`
- CLAUDE.md §KNOWLEDGE-CONVERSION-MS0 (3-lane router) · §CROSS-SUBSTRATE-SYNERGY-MS0 (typed edge spine = the galaxy ontology) · §NN-GRAPH (GNN reasoning tier that reads converted edges) · "Recent regressions" tribal-brain fail-OPEN clobbers (the R12 silent-drop lesson, lived)
