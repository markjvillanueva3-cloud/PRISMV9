---
title: Knowledge-Conversion Open-Source Atlas — the living NLP / information-extraction / ETL keep-learning directory
galaxy: knowledge-conversion
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: "Every source below was WebFetched + confirmed live, free/legal, and reachable while writing this entry (2026-06-10). Confirmed: spaCy linguistic-features docs + spaCy training docs; Stanford CS224N course page (which itself links the free YouTube lecture playlists) + the CS224N 2023 YouTube playlist (title resolved on two fetches); Jurafsky & Martin SLP3 3rd-ed free draft (Jan 6 2026 PDF); NLTK book ch.7 (CC BY-NC-ND); NLP-progress relation-extraction tracker (TACRED/SemEval/FewRel leaderboards); ACL Anthology open-access archive (CC-licensed); Universal Dependencies project (CC/GPL treebanks); Hugging Face free NLP/LLM course; MIT OCW 6.864 Advanced NLP (CC BY-NC-SA); Stanford CS324 LLMs (free lecture notes); Python codecs official docs; W3C i18n 'What is a character encoding'; Hugging Face Datasets hub. DROPPED per R12: Stanford Online YouTube channel URL (HTTP 404 — the CS224N course page already supplies the verified video link). Cadence/operating-point numbers are owner-gated, not fabricated."
tags: [knowledge-conversion, source-atlas, keep-learning, living-curriculum, NLP, information-extraction, NER, relation-extraction, ETL, encoding, dependency-parsing, CS224N, jurafsky-martin, spaCy, NLTK, MIT-OCW, ACL-anthology, universal-dependencies, huggingface, free-courses, open-data]
---

# Knowledge-Conversion Open-Source Atlas

The **living-source curriculum** for the knowledge-conversion galaxy: a curated, kept-fresh directory of WHERE TO KEEP LEARNING this galaxy's domain from reputable FREE / LEGAL sources, so the knowledge never goes stagnant. This galaxy's domain is **NLP + information-extraction + ETL** — turning raw source material (MIT-OCW transcripts, the engine monolith, tribal tips, the PDF corpus) into structured, queryable knowledge nodes (CLAUDE.md §KNOWLEDGE-CONVERSION-MS0).

This is the third leg of the galaxy's wiki triad and is **deliberately distinct** from its siblings — read those first, they are NOT repeated here:
- [[knowledge-conversion-foundations]] — the *synthesized theory* (what the IE / KR / ETL pipeline IS).
- [[knowledge-conversion-applied-practice]] — the *practitioner gotchas* (what goes wrong when you run one).
- **This entry** — the *keep-learning directory*: WHERE the freshest free knowledge lives so neither of the above ever rots.

Every entry below: the source name, the WebFetch-verified URL, one line on what it teaches, and which part of THIS galaxy it feeds. Only sources confirmed live + free/legal on 2026-06-10 are listed (R12). A short verified list beats a long fabricated one.

---

## 1. Free college courses (the curriculum spine)

| Source | What it teaches | Feeds this galaxy |
|--------|-----------------|-------------------|
| **Stanford CS224N — NLP with Deep Learning** — https://web.stanford.edu/class/cs224n/ | Word vectors, RNNs/LSTMs, Transformers + self-attention, pretraining/fine-tuning, tokenization, RAG. The flagship free NLP course; the page itself links the free YouTube lecture playlists + posts slides/notes. | The neural front-end any conversion extractor sits on (embeddings -> sequence models -> transformers). |
| **MIT OpenCourseWare 6.864 — Advanced NLP** (Collins & Barzilay, CC BY-NC-SA) — https://ocw.mit.edu/courses/6-864-advanced-natural-language-processing-fall-2005/ | Graduate NLP: syntactic/semantic/discourse models, corpus-based methods; explicitly names **information extraction** as a core application alongside parsing and summarization. | The graduate framing of extraction-as-representation — Lane C's node-shaping design. |
| **Stanford CS324 — Large Language Models** (free lecture notes) — https://stanford-cs324.github.io/winter2022/ | LLM capabilities, data, scaling, harms, fine-tuning — written-up lecture notes (not just slides). | The modern LLM substrate behind Ollama-offloaded extraction (CLAUDE.md §AI SYSTEM ROUTING). |
| **Hugging Face — free NLP / LLM Course** ("completely free and without ads") — https://huggingface.co/learn/nlp-course/chapter1/1 | Transformers library, tokenizers, Datasets, token classification (NER), fine-tuning — hands-on, runnable. | The how-to layer between CS224N theory and a real PRISM extractor; token-classification = NER for domain entities. |

> CS224U (NLU) and SLP3 chapter-map are already grounded in [[knowledge-conversion-foundations]] §3/§5 — not duplicated here.

## 2. Free textbooks & open references

| Source | What it teaches | Feeds this galaxy |
|--------|-----------------|-------------------|
| **Jurafsky & Martin — Speech and Language Processing, 3rd ed.** (free online draft, single PDF, released Jan 6 2026) — https://web.stanford.edu/~jurafsky/slp3/ | The canonical NLP text. Ch.17 sequence labeling for POS + named entities, Ch.19 dependency parsing, Ch.20 information extraction (relations/events/time). | The reference architecture + chapter dependency order (parse before extract) the conversion lanes are measured against. |
| **Bird, Klein & Loper — NLP with Python, ch.7 "Extracting Information from Text"** (NLTK book, CC BY-NC-ND) — https://www.nltk.org/book/ch07.html | The five-stage IE pipeline (segment -> tokenize -> POS-tag -> NER -> relation-extract) with runnable Python + the classic gazetteer/false-positive gotchas. | The textbook IE pipeline that PRISM's 3-lane router is an instance of. |

## 3. Official docs & tooling (the implementation reference)

| Source | What it teaches | Feeds this galaxy |
|--------|-----------------|-------------------|
| **spaCy — Linguistic Features** (official docs) — https://spacy.io/usage/linguistic-features | Production NER ("fast statistical entity recognition"), POS tagging, dependency parsing, tokenization — the exact API a real extractor calls. | The off-the-shelf NER/parse front-end for a conversion lane before any custom training. |
| **spaCy — Training Pipelines & Models** (official docs) — https://spacy.io/usage/training | Preparing training data, customizing the pipeline, `spacy train`, fine-tuning NER on custom annotations. | Domain-adapting NER to JM-Die manufacturing entities (the brittleness gotcha in [[knowledge-conversion-applied-practice]] §1.1). |
| **Python `codecs` module** (official docs) — https://docs.python.org/3/library/codecs.html | Standard encodings (UTF-8 et al.) + decode/encode error handlers (`strict`/`replace`/`surrogateescape`). | The encoding contract for the ETL extract phase — defends against the mojibake silent-corruption gotcha ([[knowledge-conversion-applied-practice]] §4). |

## 4. Standards & schemas (the interoperability layer)

| Source | What it teaches | Feeds this galaxy |
|--------|-----------------|-------------------|
| **Universal Dependencies** — https://universaldependencies.org/ | "A framework for consistent annotation of grammar (parts of speech, morphological features, and syntactic dependencies) across different human languages" — 200+ free CC/GPL treebanks. | The shared dependency-relation scheme; the head-dependent path is the standard relation-extraction feature (foundations §3). |
| **W3C i18n — "What is a character encoding?"** — https://www.w3.org/International/questions/qa-what-is-encoding | What a character encoding is and the standing recommendation: "you should nowadays always choose the UTF-8 character encoding for your content or data." | The standards basis for the galaxy's UTF-8-end-to-end / ASCII-in-code discipline (encoding gotcha). |

## 5. Lecture-video channels & playlists (passive keep-fresh)

| Source | What it teaches | Feeds this galaxy |
|--------|-----------------|-------------------|
| **Stanford CS224N 2023 lecture playlist** (free, YouTube) — https://www.youtube.com/playlist?list=PLoROMvodv4rMFqRtEuo6SGjY4XbRIVRd4 | Full CS224N lectures on video — transformers, attention, fine-tuning, walked through end-to-end. (The CS224N course page in §1 is the canonical index to this + prior-year playlists.) | The video form of the §1 spine; ideal for /video-learn ingestion into the academy/NN corpora. |

> The CS224N course page (§1) is the durable index to all year-versioned playlists — if a specific playlist ID rots, re-derive the current one from the course page rather than guessing a link.

## 6. Data & archives (the corpora + the literature)

| Source | What it teaches | Feeds this galaxy |
|--------|-----------------|-------------------|
| **ACL Anthology** (open-access, CC-licensed; ~122K papers) — https://aclanthology.org/ | The free archive of ACL/EMNLP/NAACL computational-linguistics research — the primary literature for IE/NER/relation-extraction technique. | The relation-extraction + IE literature the foundations entry's claims trace back to; the place to track SOTA when a lane underperforms. |
| **NLP-progress — Relationship Extraction tracker** — https://nlpprogress.com/english/relationship_extraction.html | Living leaderboards + benchmark datasets (TACRED, SemEval-2010 Task 8, FewRel, NYT) with F1, model architectures, paper + code links. | The honest external yardstick for relation-extraction quality and the dataset menu for evaluating PRISM's edge extractor. |
| **Hugging Face Datasets hub** (free, open) — https://huggingface.co/datasets | 1M+ open ML/NLP datasets — text corpora, NER, relation-extraction benchmarks; filter by format/modality/size. | Free held-out + benchmark corpora to *measure* a conversion lane on real data instead of "looks fine" (R12). |

---

## Keep-fresh cadence

This atlas is a **living directory** — it rots silently if not re-walked. Recommended owner (golf) cadence:

- **Per release-cycle (course refresh):** Stanford CS224N reposts slides/notes + a new year's YouTube playlist each offering. Re-check the **course page** (§1, the durable index) and update the §5 playlist link from it — never hand-edit a guessed playlist ID. Hugging Face course chapters are extended periodically; re-fetch chapter1/1.
- **On SLP3 redraft:** Jurafsky & Martin reissue the single PDF (current: Jan 6 2026). When the dated PDF changes, re-confirm the chapter map in [[knowledge-conversion-foundations]] §3 still holds.
- **Quarterly (links + standards):** re-WebFetch every URL in §Sources; any 2x-failed fetch is DROPPED (the Stanford Online channel was dropped this way 2026-06-10), and a replacement is added only after its own live confirmation. Standards (W3C i18n, Python codecs, Universal Dependencies) move slowly — a yearly re-check suffices.
- **Continuous (SOTA drift):** NLP-progress + ACL Anthology are the early-warning surface — when a conversion lane's measured relation-extraction F1 lags the public leaderboard materially, that is the maintenance signal to revisit technique (it is NOT a hardcoded threshold here — see Owner-gate).
- **Verification discipline:** every add must be WebFetch-confirmed live + free/legal before it lands; a short verified list beats a long stale one. Mojibake-check non-ASCII content end-to-end when ingesting any of these into PRISM corpora ([[knowledge-conversion-applied-practice]] §4).

### Owner-gate (NOT promoted)
The galaxy owner (golf) binds these against PRISM's real corpora — they are not in this atlas because they are not WebFetch-confirmable institutional facts (R12): the **measured per-lane extraction F1 / operating point** vs the NLP-progress leaderboards; the **exact re-walk schedule** wired into a cron; the **which-corpora-carry-non-ASCII** map for the encoding gate. The atlas points at WHERE to learn; the numbers stay owner-measured.

## Sources

> Each URL was WebFetched + confirmed live, free, and legal on 2026-06-10. Distinct list (15 confirmed):

**Free college courses (4):**
- Stanford CS224N — NLP with Deep Learning — https://web.stanford.edu/class/cs224n/
- MIT OpenCourseWare 6.864 — Advanced NLP (CC BY-NC-SA) — https://ocw.mit.edu/courses/6-864-advanced-natural-language-processing-fall-2005/
- Stanford CS324 — Large Language Models (free lecture notes) — https://stanford-cs324.github.io/winter2022/
- Hugging Face — free NLP / LLM Course — https://huggingface.co/learn/nlp-course/chapter1/1

**Free textbooks & open references (2):**
- Jurafsky & Martin — Speech and Language Processing, 3rd ed. (free draft) — https://web.stanford.edu/~jurafsky/slp3/
- Bird, Klein & Loper — NLP with Python ch.7 (NLTK book, CC BY-NC-ND) — https://www.nltk.org/book/ch07.html

**Official docs & tooling (3):**
- spaCy — Linguistic Features — https://spacy.io/usage/linguistic-features
- spaCy — Training Pipelines & Models — https://spacy.io/usage/training
- Python `codecs` module — https://docs.python.org/3/library/codecs.html

**Standards & schemas (2):**
- Universal Dependencies — https://universaldependencies.org/
- W3C i18n — What is a character encoding? — https://www.w3.org/International/questions/qa-what-is-encoding

**Lecture-video (1):**
- Stanford CS224N 2023 lecture playlist (YouTube) — https://www.youtube.com/playlist?list=PLoROMvodv4rMFqRtEuo6SGjY4XbRIVRd4

**Data & archives (3):**
- ACL Anthology (open-access) — https://aclanthology.org/
- NLP-progress — Relationship Extraction tracker — https://nlpprogress.com/english/relationship_extraction.html
- Hugging Face Datasets hub — https://huggingface.co/datasets

> Dropped per R12 (fetch failed, not guessed): Stanford Online YouTube channel `https://www.youtube.com/c/StanfordOnline` returned HTTP 404 — the CS224N course page (§1) already supplies the verified video link, so no replacement guess was made.

## Cross-refs
- Theory: [[knowledge-conversion-foundations]] (IE/KR/ETL theory — sources overlap by design but framing is "what it IS")
- Practice: [[knowledge-conversion-applied-practice]] (NLP/extraction/ETL gotchas — "what goes wrong")
- Galaxy brain: `mcp-server/src/engines/knowledge-conversion/MEMORY.md`
- CLAUDE.md §KNOWLEDGE-CONVERSION-MS0 (3-lane router) · §AI SYSTEM ROUTING (Ollama offload) · §CROSS-SUBSTRATE-SYNERGY-MS0 (the galaxy ontology these sources inform)
