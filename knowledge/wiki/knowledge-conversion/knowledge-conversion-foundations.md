---
title: Knowledge-Conversion Foundations — information extraction, knowledge representation, ontologies, ETL
galaxy: knowledge-conversion
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-meta-create-workflow (2026-06-10)"
verification_method: domain facts WebFetch-confirmed against free academic + reference sources (Stanford CS224N + CS224U course pages, Jurafsky & Martin "Speech and Language Processing" 3rd-ed free draft, MIT OCW 6.864 Advanced NLP, NLTK "Natural Language Processing with Python" CC-licensed textbook); core NLP/KR/ETL definitions cross-confirmed against Wikipedia reference articles (information extraction, named-entity recognition, relationship extraction, knowledge representation & reasoning, ontology, ETL, dependency grammar). PRISM-galaxy relevance lines map each theme to how knowledge-conversion uses it.
tags: [knowledge-conversion, information-extraction, NER, relation-extraction, knowledge-representation, ontology, ETL, dependency-parsing, NLP, CS224N, jurafsky-martin, MIT-OCW, NLTK, semantic-web, knowledge-graph]
---

# Knowledge-Conversion Foundations

The domain-knowledge spine for the **knowledge-conversion** galaxy: the academic grounding behind PRISM's job of turning raw source material (MIT-OCW transcripts, the engine monolith, tribal tips, PDF corpus) into structured, queryable knowledge nodes routed into the wiki / memory / tribal / NN substrates. This galaxy is fundamentally an **information-extraction + knowledge-representation pipeline**, so the foundations below come from the corresponding free CS/computational-linguistics curriculum: NLP courses, the canonical NLP textbook, and the established theory of knowledge representation, ontologies, and ETL.

Every theme below is grounded in a source that was actually WebFetched + confirmed (marked CONFIRMED). Definitions of established theory (KR formalisms, the IE pipeline, dependency relations) are asserted with citation. Values/thresholds specific to PRISM's own corpora remain in the **Owner-gate** section, not hardcoded here (R12).

## 1. Information extraction — the core task of this galaxy (unstructured text -> structured knowledge)

**CONFIRMED** ([Wikipedia, Information extraction](https://en.wikipedia.org/wiki/Information_extraction)):
- Information extraction (IE) is **"the task of automatically extracting structured information from unstructured and/or semi-structured machine-readable documents"** — typically via NLP techniques.
- IE occupies a **middle ground between information retrieval** (statistical indexing/classification of large document collections) **and full NLP** (modeling human language) — it requires documents to follow predictable patterns or templates, and converts text into machine-reasonable structured data that supports **knowledge-base population**.
- The canonical IE **subtasks** are: **named-entity recognition, coreference resolution, relationship extraction, terminology extraction, and template filling.**

**CONFIRMED** ([NLTK book, ch.7 "Extracting Information from Text"](https://www.nltk.org/book/ch07.html), Bird/Klein/Loper, CC-licensed free textbook): the IE architecture is a **five-stage pipeline — sentence segmentation -> tokenization -> part-of-speech tagging -> named-entity recognition -> relation extraction** — where entity recognition is a *prerequisite* for relation detection (you bound the entities first, then search for patterns connecting nearby entities).

**Relevance to knowledge-conversion:** this IS the galaxy's job description. PRISM's 3-lane knowledge-conversion router (Lane A direct-wire, Lane B port-verify, Lane C 6-node-type forge-queue, per CLAUDE.md §KNOWLEDGE-CONVERSION-MS0) is an IE pipeline by another name: it segments source material, identifies the knowledge entities (engine/algorithm/formula/tip nodes), and emits structured nodes. The NLTK five-stage pipeline is the textbook reference architecture the lanes should be measured against.

## 2. Named-entity recognition + relation extraction (the two extraction sub-engines)

### NER
**CONFIRMED** ([Wikipedia, Named-entity recognition](https://en.wikipedia.org/wiki/Named-entity_recognition)):
- NER is **"a subtask of information extraction that seeks to locate and classify named entities mentioned in unstructured text into pre-defined categories"** (person/PER, organization/ORG, location/LOC, geopolitical/GPE, time expressions, quantities, monetary values, percentages).
- Three approach families: **grammar/rule-based** (hand-crafted, high precision, expensive), **statistical** (ML features + Viterbi decoding), and **neural** (transformers, biLSTM token classification).
- Evaluated with **precision, recall, and F1** (harmonic mean) on exact span match — a deliberately "pessimistic" metric that penalizes partial matches as full failures.

### Relation extraction
**CONFIRMED** ([Wikipedia, Relationship extraction](https://en.wikipedia.org/wiki/Relationship_extraction)):
- Relation extraction **"requires the detection and classification of semantic relationship mentions within a set of artifacts, typically from text or XML documents."**
- It is close to IE but IE additionally de-duplicates and spans many relation types; modern systems **jointly learn to extract entity mentions and their semantic relations** (end-to-end), and relations can be serialized as **RDF** for web data.

**Relevance to knowledge-conversion:** these are the two extraction sub-engines for any source-to-node conversion. When the galaxy ingests a manufacturing transcript, NER is what isolates the domain entities (a tool, a material, a controller, an alarm code) and relation extraction is what links them (this tip *applies-to* that machine; this formula *computes* that quantity) — exactly the edge types the cross-substrate edge spine (CLAUDE.md §CROSS-SUBSTRATE-SYNERGY-MS0) materializes. The exact-span F1 metric is the honest yardstick for grading the extractor instead of "looks fine" (R12).

## 3. NLP foundations the extraction pipeline depends on (parsing, tagging, embeddings)

### The canonical free NLP textbook
**CONFIRMED** ([Jurafsky & Martin, "Speech and Language Processing", 3rd ed.](https://web.stanford.edu/~jurafsky/slp3/)): the standard NLP text, **free online as a draft** (3rd-ed draft released 2026-01-06). Directly relevant chapters: **Ch.2 "Words and Tokens", Ch.3 "N-gram Language Models", Ch.5 "Embeddings", Ch.17 "Sequence Labeling for Parts of Speech and Named Entities", Ch.19 "Dependency Parsing", Ch.20 "Information Extraction: Relations, Events, and Time."** (Chapter titles quoted verbatim.)

### Dependency parsing — the syntactic backbone of relation extraction
**CONFIRMED** ([Wikipedia, Dependency grammar](https://en.wikipedia.org/wiki/Dependency_grammar)):
- Dependency grammar is built on the **dependency relation** (head governs dependent), as opposed to the constituency relation of phrase-structure grammar; every word links directly or indirectly to the finite verb.
- It uses a **one-to-one element-to-node correspondence** (flatter, more minimal trees than phrase-structure), and **Universal Dependencies** harmonizes treebanks into a shared representation.

### The deep-learning NLP course spine
**CONFIRMED** ([Stanford CS224N "Natural Language Processing with Deep Learning"](https://web.stanford.edu/class/cs224n/)): the flagship free NLP course — word vectors (word2vec/GloVe), language models + RNNs, **Transformers + self-attention**, pretraining/fine-tuning, RAG, tokenization. The progression from embeddings -> sequence models -> transformers is the modern stack any neural extractor in this galaxy would sit on.

**Relevance to knowledge-conversion:** before you can extract entities/relations you must tokenize, tag, and parse — so the galaxy inherits the whole NLP front-end. Dependency parses are the standard feature for relation extraction (the head/dependent path between two entities is a strong relation signal), and the SLP3 chapter map (Ch.17 sequence labeling -> Ch.19 dependency parsing -> Ch.20 IE) is the exact dependency order the galaxy's conversion lanes should follow (R13 logical order: parse before you extract).

## 4. Knowledge representation — what the extracted knowledge is stored AS

**CONFIRMED** ([Wikipedia, Knowledge representation and reasoning](https://en.wikipedia.org/wiki/Knowledge_representation_and_reasoning)):
- KRR models information in a structured manner so systems can reason over it; **"knowledge representation goes hand in hand with automated reasoning because one of the main purposes of explicitly representing knowledge is to be able to reason about that knowledge, to make inferences, assert new knowledge, etc."**
- The formalism families: **semantic networks, frames, rules/rule-based systems, logic programs, ontologies, first-order logic, description logics, vocabularies/thesauri** — and virtually every KR language ships an inference/reasoning engine (theorem provers, classifiers).

### The graduate NLP course that frames extraction as a representation problem
**CONFIRMED** ([MIT OCW 6.864 "Advanced Natural Language Processing", Fall 2005](https://ocw.mit.edu/courses/6-864-advanced-natural-language-processing-fall-2005/), Collins & Barzilay, free under Creative Commons): graduate NLP covering **"syntactic, semantic and discourse processing models, emphasizing machine learning or corpus-based methods"** — explicitly naming **information extraction** as a key application alongside parsing, language modeling, MT, and summarization.

**Relevance to knowledge-conversion:** extraction is only half the job — the extracted facts must land in a *representation* that supports retrieval and inference. PRISM's substrates ARE the representation layer: the system-viz graph is a semantic network, the wiki/memory nodes are a frame-like structure, and the NN/GNN tier reasons over the graph. Choosing the right representation per node-type (the 6 node-types in Lane C) is the KR design decision this section grounds; "represent so you can reason" is why edges carry typed semantics, not free text.

## 5. Ontologies — the shared vocabulary that keeps converted knowledge interoperable

**CONFIRMED** ([Wikipedia, Ontology (information science)](https://en.wikipedia.org/wiki/Ontology_(information_science))):
- An ontology is **"a representation, formal naming, and definitions of the categories, properties, and relations between concepts, data, or entities"** — and per **Tom Gruber's 1993 definition, "a specification of a conceptualization."**
- Core components: **classes/concepts, attributes/properties, relations, and individuals/instances.**
- Ontologies bridge structured information exchange across systems (interoperability, discoverability), expressed in **OWL** (Web Ontology Language, built from **RDF/RDFS**), enabling automated reasoning and knowledge integration across distributed systems.

### The Stanford NLU course (contextual representations + retrieval)
**CONFIRMED** ([Stanford CS224U "Natural Language Understanding"](https://web.stanford.edu/class/cs224u/)): covers contextual word representations (BERT/RoBERTa/T5/BART), retrieval-augmented generation + dense passage retrieval, and rigorous behavioral evaluation / analysis methods — the "understand + evaluate" complement to CS224N's "model + train."

**Relevance to knowledge-conversion:** an ontology is the controlled vocabulary that stops the galaxy from minting a fresh, drifting label for every extracted concept — it is the schema that the cross-substrate edge spine's typed whitelist (`documented-by | owned-by-slot | embeds | consensus-of`) already approximates: a *specification of a conceptualization* of how PRISM nodes relate. Gruber's classes/relations/individuals map onto PRISM's node-kinds / edge-types / node-ids. CS224U's evaluation discipline is the reminder that a converted knowledge node must be *evaluated* (precision/recall on real queries), not assumed correct.

## 6. ETL — the engineering pattern for the conversion pipeline itself

**CONFIRMED** ([Wikipedia, Extract, transform, load](https://en.wikipedia.org/wiki/Extract,_transform,_load)):
- ETL is **"a three-phase computing process where data is extracted from an input source, transformed (including cleaning), and loaded into an output data container."**
- **Extract** pulls from heterogeneous sources (relational DBs, flat files, XML, JSON); **Transform** applies "a series of rules or functions ... to prepare it for loading" (data cleansing, **deduplication and record linkage**, format conversion, **validation/integrity checks**, aggregation); **Load** writes into the target store (overwrite or append).
- **ELT** reverses the order (load raw, transform in-place) — faster, better for unstructured data, popular on cloud warehouses; a **staging area** holds data between extract and publish for validation/audit.

**Relevance to knowledge-conversion:** ETL is the *systems* discipline behind the *linguistic* IE pipeline — the galaxy's conversion run is an ETL job (extract from MIT-OCW/monolith/tribal/PDF, transform = the IE extraction + node-shaping, load into wiki/memory/graph). The Transform-phase requirements ETL names — **deduplication, record linkage, validation/integrity checks** — are exactly PRISM's `duplicationGuardEngine` (no duplicate nodes), the master-index search-first discipline (record linkage to existing assets), and the R12 fail-loud validation gates. The staging-area pattern is why conversion lands in a staging surface before atomic merge into the canonical graph (CLAUDE.md §CROSS-SUBSTRATE-SYNERGY, single-writer merge).

## Owner-gate (NOT promoted)

The following are deliberately left for golf (galaxy owner) to bind against PRISM's actual corpora + code before any engine hardcodes them — they are not WebFetch-confirmable institutional facts and must not be fabricated:

- **Per-lane extraction accuracy targets** (the precision/recall/F1 thresholds the IE metric in section 2 implies) — must be measured on PRISM's real source corpora (MIT-OCW transcripts, monolith, tribal tips), not assumed. The textbook gives the *metric*; the *threshold* is owner-bound.
- **The canonical PRISM node ontology** — the exact class/relation/individual schema (which is the "specification of a conceptualization" for PRISM's node-kinds + the typed edge whitelist). Section 5 grounds *why* an ontology exists; the concrete schema lives in the cross-substrate edge spine + system-viz node-card schema, owned by golf/sierra, and should be cross-checked against those, not re-derived here.
- **De-duplication / record-linkage rules for converted nodes** — section 6 names dedup + record linkage as mandatory Transform-phase steps; the actual match keys and thresholds are owned by `duplicationGuardEngine` + the master-index, not this foundations entry.
- **Specific course module lists** — the week-by-week MIT-OCW 6.864 and CS224N syllabus detail sit behind per-lecture PDFs not fully rendered on the landing pages; adopt at the topic level (confirmed above), bind module-level content only after a direct per-lecture fetch.

## Sources

> Each URL below was WebFetched + confirmed while writing this entry (2026-06-10). Free college-course / free-textbook sources are prioritized per the domain mandate; the reference articles supply the canonical definitions of the extraction + representation subtasks.

**Free college-course / free-textbook sources (5):**
- **Stanford CS224N — "Natural Language Processing with Deep Learning"** (free university course) — https://web.stanford.edu/class/cs224n/
- **Stanford CS224U — "Natural Language Understanding"** (free university course) — https://web.stanford.edu/class/cs224u/
- **MIT OpenCourseWare 6.864 — "Advanced Natural Language Processing" (Fall 2005, Collins & Barzilay, CC-licensed)** (free university course) — https://ocw.mit.edu/courses/6-864-advanced-natural-language-processing-fall-2005/
- **Jurafsky & Martin — "Speech and Language Processing", 3rd edition (free online draft)** (free textbook) — https://web.stanford.edu/~jurafsky/slp3/
- **Bird, Klein & Loper — "Natural Language Processing with Python", ch.7 "Extracting Information from Text" (NLTK book, CC BY-NC-ND)** (free textbook) — https://www.nltk.org/book/ch07.html

**Reference articles (canonical subtask definitions) (6):**
- **Information extraction** — https://en.wikipedia.org/wiki/Information_extraction
- **Named-entity recognition** — https://en.wikipedia.org/wiki/Named-entity_recognition
- **Relationship extraction** — https://en.wikipedia.org/wiki/Relationship_extraction
- **Knowledge representation and reasoning** — https://en.wikipedia.org/wiki/Knowledge_representation_and_reasoning
- **Ontology (information science)** — https://en.wikipedia.org/wiki/Ontology_(information_science)
- **Extract, transform, load (ETL)** — https://en.wikipedia.org/wiki/Extract,_transform,_load
- **Dependency grammar** — https://en.wikipedia.org/wiki/Dependency_grammar

> Not promoted (fetch failed twice — left out per R12): Stanford Encyclopedia of Philosophy "Knowledge Representation and Reasoning" entry (HTTP 404), Stanford KSL "What is an Ontology?" (Gruber) page (connection refused), MIT OCW 6.806 NLP Spring-2003 page (HTTP 404). The Gruber "specification of a conceptualization" definition was instead confirmed via its quotation in the Wikipedia Ontology article above.

## Cross-refs
- Galaxy brain: `mcp-server/src/engines/knowledge-conversion/MEMORY.md`
- CLAUDE.md §KNOWLEDGE-CONVERSION-MS0 (3-lane router) · §CROSS-SUBSTRATE-SYNERGY-MS0 (typed edge spine) · §NN-GRAPH (GNN reasoning tier)
