---
title: Token-Optimization Open Source Atlas — Where to Keep Learning Information Theory & Compression (Free/Legal)
galaxy: token-optimization
owner_slot: alpha
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: "Every source listed below was fetched live with WebFetch on 2026-06-10 and confirmed real, free/legal, and reachable BEFORE listing. Candidate links that returned HTTP 403/404 or could not be content-confirmed were retried once then DROPPED, not guessed (David MacKay ITILA site -> 403 twice; Cover & Thomas Wikipedia page -> 404; a Harvard-hosted Shannon PDF -> binary that could not be parse-confirmed; the 3Blue1Brown channel page -> truncated, unconfirmable). This atlas is the keep-learning DIRECTORY for the galaxy; the synthesized theory lives in token-optimization-foundations.md and the practitioner gotchas in token-optimization-applied-practice.md and are NOT repeated here. Each 'feeds' line is a PRISM-internal mapping (reasoned, not quoted) and is the appropriate place for owner scrutiny."
tags: [token-optimization, source-atlas, living-source, information-theory, compression, entropy, source-coding, free-courses, open-textbook, ocw, standards, keep-learning, curriculum]
---

# Token-Optimization Open Source Atlas

This is the **living-source curriculum** for the token-optimization galaxy (owner: alpha): a curated, kept-fresh directory of WHERE TO KEEP LEARNING this galaxy's domain — information theory, source coding, and data compression — from reputable **free and legal** sources, so the galaxy's knowledge never goes stagnant.

It is deliberately distinct from its two sibling entries:
- `token-optimization-foundations.md` — the synthesized THEORY (entropy, Kraft, KL, channel capacity, Kolmogorov). Read it for the *why*.
- `token-optimization-applied-practice.md` — the practitioner GOTCHAS (cache TTL, lossy generation loss, dedup false-merge, lost-in-the-middle). Read it for *what goes wrong*.

This page is the **directory of destinations** — the courses, books, archives, video lectures, official docs, and standards you return to in order to go deeper or refresh. It does not re-derive their content; it points at where to learn it from the primary, free source. Every link below was fetched and confirmed live (see frontmatter `verification_method`).

The galaxy's mission — move maximum useful signal through a bounded context window at minimum token cost — is one engineering expression of information theory and source coding. The sources below are the canonical free places to keep learning that body of theory.

---

## 1. Free college courses (lecture notes, problem sets, units)

| Source | URL | Teaches | Feeds (galaxy) |
|--------|-----|---------|----------------|
| **MIT 6.050J — Information and Entropy** (OCW, Spring 2008) | https://ocw.mit.edu/courses/6-050j-information-and-entropy-spring-2008/ | Undergraduate intro: bits and codes, compression, channel capacity, entropy and its link to thermodynamics. Ships a full open textbook, 13 thematic units, problem sets with solutions, and programming assignments (CC-licensed). | The unit-1 "Bits and Codes" + compression units are the gentlest on-ramp to the entropy floor + lossless/lossy split in `foundations.md` §2/§4. |
| **MIT 6.441 — Information Theory** (OCW, Spring 2016, Polyanskiy) | https://ocw.mit.edu/courses/6-441-information-theory-spring-2016/ | Graduate mathematics of information theory: entropy, lossless data compression, binary hypothesis testing, channel coding, lossy data compression. Free lecture notes + problem sets (CC-BY-NC-SA). | The rigorous source-coding-theorem + rate-distortion track behind `foundations.md` §2 and §6 (channel capacity), when the undergraduate treatment is no longer enough. |
| **Stanford EE376A — Information Theory** (Weissman) | https://web.stanford.edu/class/ee376a/ | "How to measure, represent, and communicate information effectively": entropy and mutual information, practical compression and error correction, with applications to ML, genomics, and quantum information. Course outline + homework on the page. | A second, application-forward angle on the same core — useful when mapping theory to the galaxy's ML-adjacent routing (Ollama offload, relevance-ranked injection). |
| **Stanford EE274 — Data Compression** (lecture notes) | https://stanforddatacompressionclass.github.io/notes/contents.html | Compression curriculum end-to-end: entropy coding, prefix-free codes, Kraft inequality, Huffman, arithmetic coding, asymmetric numeral systems (ANS), context-based + LZ77 universal compression; lossy quantization, rate-distortion, transform coding. Free notes + homework with solutions + the SCL library tutorials. | The single best free deep-dive on the *coding* mechanics behind `foundations.md` §3 (Kraft/Huffman) and the lossless techniques (dedup, shortcodes) the galaxy treats as always-safe. |

## 2. Free primary sources & textbooks (read the original)

| Source | URL | Teaches | Feeds (galaxy) |
|--------|-----|---------|----------------|
| **Shannon (1948), "A Mathematical Theory of Communication"** — original Bell System Technical Journal, on Internet Archive | https://archive.org/details/bstj27-3-379 | The founding paper itself: entropy H = -Sum p log p, the bit, source coding, channel capacity, the noisy-channel theorem. Freely viewable + downloadable (PDF / EPUB / plain text). | The primary source for the entire galaxy doctrine — read the original derivations rather than only the secondary summaries cited in `foundations.md`. |
| **"A Mathematical Theory of Communication" — encyclopedic overview** (Wikipedia) | https://en.wikipedia.org/wiki/A_Mathematical_Theory_of_Communication | A navigable map of what the 1948 paper introduced (entropy, the bit credited to Tukey, channel capacity, source + noisy-channel coding theorems) with onward links to free copies. | A 10-minute orientation before tackling the primary source above; the cross-link hub for the rest of the info-theory corpus. |

> **Owner-gate note on textbooks:** Two canonical free textbooks were targeted and could NOT be confirmed reachable by WebFetch on 2026-06-10 and so are DROPPED from the verified list: David MacKay, *Information Theory, Inference, and Learning Algorithms* (the inference.org.uk host returned HTTP 403 to automated fetches on both candidate URLs — the book is widely known to be a free legal download for human browsers, so alpha should re-check by hand and add it if it loads); and the Cover & Thomas *Elements of Information Theory* Wikipedia reference page (HTTP 404). Neither is fabricated here precisely because neither fetch succeeded.

## 3. Lecture-video & open-courseware destinations

The free university courses in Section 1 are the galaxy's primary video/lecture destinations — MIT OpenCourseWare (ocw.mit.edu) and the Stanford EE376A / EE274 course sites publish lecture material, notes, and assignments openly. Rather than list a separate, less-stable channel link (a YouTube channel page could not be content-confirmed on this pass and was dropped), treat the Section 1 course homepages as the canonical, kept-current lecture entry points: each links its own current-term recordings, problem sets, and notes from a stable institutional URL.

- MIT 6.050J / 6.441 lecture material and units: via the OCW course pages in Section 1.
- Stanford EE376A / EE274 lecture notes + assignments: via the Stanford course pages in Section 1.

## 4. Official docs (vendor — measure your own token cost)

| Source | URL | Teaches | Feeds (galaxy) |
|--------|-----|---------|----------------|
| **Anthropic — Token counting** (official Claude docs) | https://platform.claude.com/docs/en/build-with-claude/token-counting | How to measure the exact token size of a prompt (system + tools + images + PDFs) BEFORE sending, via the free `count_tokens` endpoint; informs rate-limit, cost, and model-routing decisions, and flags that newer tokenizers can emit ~30% more tokens for identical text. | The galaxy's *measurement instrument*: you cannot optimize token cost you do not measure. Distinct from the prompt-caching doc cited in `applied-practice.md` — this is the metering surface, that one was the caching surface. |

## 5. Official standards (compression formats — the practiced theory)

| Source | URL | Teaches | Feeds (galaxy) |
|--------|-----|---------|----------------|
| **RFC 1951 — DEFLATE Compressed Data Format v1.3** (IETF, P. Deutsch) | https://www.rfc-editor.org/rfc/rfc1951 | The exact specification of a real-world lossless compressor: DEFLATE = LZ77 (dictionary/redundancy elimination) + Huffman coding (minimum-redundancy prefix codes). Freely copyable/distributable per its own notice. | The concrete, standardized embodiment of `foundations.md` §3 (Huffman/Kraft) and §4 (lossless = remove statistical redundancy). Shows the theory in a deployed wire format — the same two ideas the galaxy's shortcodes + byte-equal dedup lean on. |

## 6. Data & archives (free benchmark corpora)

| Source | URL | Teaches | Feeds (galaxy) |
|--------|-----|---------|----------------|
| **The Canterbury Corpus** | https://corpus.canterbury.ac.nz/ | The standard free benchmark "to enable researchers to evaluate lossless compression methods" — a fixed set of test files plus published compression results across methods. | The galaxy's reference dataset for reasoning empirically about lossless reduction: a stable place to see real compression ratios on real data, grounding the entropy-floor intuition (you cannot losslessly squeeze below a source's entropy) with measured numbers. |

---

## Keep-fresh cadence

This atlas is a *living* directory — the point is that the knowledge does not go stale. Suggested refresh discipline for alpha (galaxy owner):

- **Per quarter:** re-fetch every URL in `## Sources` and confirm it still resolves (HTTP 200, content matches). University course pages roll to new terms — MIT OCW and Stanford course homepages sometimes re-number or move; update the link to the newest free term offering rather than letting it 404.
- **On any DROPPED-source recovery:** retry the MacKay ITILA and Cover & Thomas references by hand (Section 2 owner-gate note). If a free legal copy loads, promote it into Section 2 with the fetch date. Never add a link that did not load.
- **On vendor-doc drift:** the Anthropic token-counting doc (Section 4) tracks the live tokenizer and pricing — re-read before quoting any per-model token-count behavior, since tokenizer changes (e.g. the ~30% increase noted for newer models) materially change the galaxy's cost math.
- **On new free destinations:** when a reputable free course / open textbook / standard in this domain is found, add it ONLY after a live fetch confirms it is real, free, legal, and reachable (R12). A short verified list beats a long fabricated one.
- **Anti-staleness backstop:** if this entry's `verified_by` date is more than ~90 days old, treat every link as provisional until re-fetched.

## Sources

All URLs fetched and read live on 2026-06-10 (free / legal: MIT OpenCourseWare, Stanford open course sites, Internet Archive, Wikipedia, IETF RFC editor, official Anthropic docs). Distinct from the sibling foundations/applied-practice source lists.

1. MIT 6.050J Information and Entropy (OCW, Spring 2008) — https://ocw.mit.edu/courses/6-050j-information-and-entropy-spring-2008/  **(free college course)**
2. MIT 6.441 Information Theory (OCW, Spring 2016) — https://ocw.mit.edu/courses/6-441-information-theory-spring-2016/  **(free college course)**
3. Stanford EE376A Information Theory — https://web.stanford.edu/class/ee376a/  **(free college course)**
4. Stanford EE274 Data Compression (lecture notes) — https://stanforddatacompressionclass.github.io/notes/contents.html  **(free lecture notes)**
5. Shannon 1948, "A Mathematical Theory of Communication" (BSTJ original, Internet Archive) — https://archive.org/details/bstj27-3-379  **(free primary source)**
6. "A Mathematical Theory of Communication" overview (Wikipedia) — https://en.wikipedia.org/wiki/A_Mathematical_Theory_of_Communication
7. Anthropic — Token counting (official docs) — https://platform.claude.com/docs/en/build-with-claude/token-counting  **(official vendor docs)**
8. RFC 1951 — DEFLATE Compressed Data Format v1.3 (IETF) — https://www.rfc-editor.org/rfc/rfc1951  **(free standard)**
9. The Canterbury Corpus (lossless-compression benchmark) — https://corpus.canterbury.ac.nz/  **(free data/archive)**
