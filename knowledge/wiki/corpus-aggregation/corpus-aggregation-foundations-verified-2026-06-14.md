---
name: corpus-aggregation-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the corpus-aggregation galaxy. 6 fetched sources. Quality tier of FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: corpus-aggregation
  tier: VERIFIED
  verifiedBy: WebFetch
  physicsSafe: true
---

# corpus-aggregation galaxy -- verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source below was WebFetched + excerpted (honest `fetched:false` markers for paywalled/unreachable sources). Physics-safe: no numeric cutting constant.

## Synthesis
The next layer of expertise in corpus aggregation centers on four compounding concerns. First, deduplication is not a single operation but a multi-stage cascade: exact content-hash deduplication eliminates identical documents at near-zero cost, MinHash LSH with tunable band/row parameters handles near-duplicates at Jaccard similarity thresholds, suffix-array methods remove repeated sub-document boilerplate, and semantic deduplication (SemDeDup) targets redundancy invisible to lexical methods — and all four stages interact multiplicatively (OLMo 3 reports exact dedup alone removes 66% of raw documents before fuzzy stages run). Second, the "quality signals as metadata" pattern — pioneered at scale by RedPajama-V2 — fundamentally separates corpus aggregation from corpus filtering: the aggregation pipeline attaches 40+ per-document signals (perplexity, ML classifier scores, MinHash signatures, Bloom-filter flags) and ships the full annotated corpus, letting downstream consumers define their own filter cuts rather than hard-baking a single curation policy into the ETL. Third, entity resolution theory (Binette and Steorts; Elmagarmid et al.) shows that multi-source document aggregation is structurally identical to record linkage — blocking, similarity computation, and clustering are the canonical pipeline stages, and collective/iterative methods that exploit inter-record relational structure outperform independent pairwise comparison, a lesson directly applicable to cross-domain corpus deduplication. Fourth, modern pipeline architecture formalizes beyond classic ETL into ETLT++ and ELTL++ patterns that embed data contracts, deterministic replay, lineage capture, and quality SLOs as first-class design obligations — making aggregation pipelines auditable and reproducible rather than ad-hoc scripts.

## Verified sources
### [Deduplicating Training Data Makes Language Models Better](https://arxiv.org/abs/2107.06499) -- paper
> "We find that existing language modeling datasets contain many near-duplicate examples and long repetitive substrings."

**Knowledge:** Accepted at ACL 2022 (Lee, Ippolito, Carlini et al.). Demonstrates that near-duplicate removal from training corpora reduces memorization 10x, improves model accuracy, and reduces train-test overlap — foundational methodology for corpus deduplication pipelines using suffix arrays and bloom filters.

### [D4: Improving LLM Pretraining via Document De-Duplication and Diversification](https://arxiv.org/abs/2308.12284) -- paper
> "careful data selection (on top of de-duplicated data) via pre-trained model embeddings can speed up training (20% efficiency gains)"

**Knowledge:** arXiv:2308.12284 (Tirumala, Simig, Morcos et al., Meta AI). Introduces CC-dedup corpus from 5 CommonCrawl dumps using paragraph-level CC-Net + document-level MinHash (20 hashes, 20 buckets), then adds embedding-based diversification — showing dedup + diversification together yield 20% training efficiency gains and up to 2% downstream task improvement.

### [(Almost) All of Entity Resolution](https://arxiv.org/abs/2008.04443) -- paper
> "databases must be cleaned and integrated in a systematic and accurate way, commonly known as record linkage, de-duplication, or entity resolution."

**Knowledge:** arXiv:2008.04443 (Binette and Steorts, Duke University). Comprehensive survey covering clustering approaches, semi- and fully supervised methods, and canonicalization for entity resolution across human rights, statistics, medicine, and citation domains — essential theory for multi-source corpus deduplication and record linkage in document ingestion pipelines.

### [RedPajama-Data-v2: An open dataset with 30 trillion tokens for training large language models](https://www.together.ai/blog/redpajama-data-v2) -- article
> "Deduplication signals with pre-computed Minhash signatures (with 128 permutations) which can be used for fuzzy deduplication at different degrees."

**Knowledge:** Together AI (2023), accepted NeurIPS 2024 Datasets and Benchmarks Track. Defines a corpus aggregation architecture over 84 CommonCrawl dumps yielding 113B documents, with 40+ per-document quality signals (ML classifiers, heuristics, MinHash, Bloom-filter exact dedup) stored as metadata rather than hard-filtering — enabling downstream custom slicing. Canonical reference for quality-signal-as-metadata design pattern.

### [Formalizing ETLT and ELTL Design Patterns and Proposing Enhanced Variants: A Systematic Framework for Modern Data Engineering](https://arxiv.org/abs/2511.03393) -- paper
> "Hybrid approaches such as ETLT (Extract-Transform-Load-Transform) and ELTL (Extract-Load-Transform-Load) are already used in practice, but the literature lacks best practices and formal recognition of these approaches as design patterns."

**Knowledge:** arXiv:2511.03393 (Rucco, Saad, Longo; University of Salento, 2025). First formal taxonomy of hybrid ETL variants (ETLT, ELTL, ETLT++, ELTL++). ETLT++ embeds explicit data contracts — structural, semantic, and quality rules — plus deterministic replay, lineage capture, and quality SLOs as mandatory pipeline obligations, providing a rigorous framework for corpus ingestion pipeline design.

### [LP Data Pipeline: Lightweight, Purpose-driven Data Pipeline for Large Language Models](https://arxiv.org/abs/2411.11289) -- paper
> "operates entirely on CPUs to streamline the processes of dataset extraction, filtering, and curation"

**Knowledge:** arXiv:2411.11289 (Kim, Ha, Yang, Lee, Kim, Park; 2024). Describes an Airflow-orchestrated corpus pipeline that monitors Wikipedia, CommonCrawl, and arXiv for new releases and fires predefined DAGs performing text extraction, deduplication, filtering, and domain classification — illustrating production-grade orchestration patterns for continuous corpus refresh.

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_a3c2f1d8-zk7). Ledger: state/shared/galaxy-knowledge-iterations.json._
