# Scrutiny Report — MIT OCW Strategic Integration
**Date:** 2026-04-15
**Subject:** `H:\prism\UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md`
**Question:** Where does MIT OpenCourseWare (coding, software dev, AI, neural networking) plug into Phase 0 to harden the awareness layer with rigor rather than being bolted on later?
**Method:** Audit existing PRISM ingestion infrastructure + map course syllabi to Phase 0 components.

---

## Audit Findings

- **`/pdf-learn mit:<course_id>` pipeline EXISTS** (`pdf-learn` skill, Phase 1B) — `ingest_document` → `classify_document` → `extract_from_document` → bridge → components. Downloads to `C:/PRISM/cad-engine/data/mit_ocw/<course_id>/`.
- **`mit_ocw/` directory is currently empty** — no MIT courses ingested yet. All prior MIT-relevant knowledge came from the MFG-focused list (2.008, 2.810, 2.72, 2.670, 2.71, 2.830, 2.875, 6.141).
- **`extraction-log.json` has no `mit:` prefixed entries** — confirms nothing is ingested.
- **~30 existing PRISM engines already address AI/ML/neural topics** (TreeOfThoughtEngine, HypothesisRankerEngine, CounterfactualReasoningEngine, CrossDisciplinaryDeepLearningEngine, FuzzyNeuralHybridEngine, KnowledgeGraphNeuralBridgeEngine, FederatedLearningEngine, AdvancedStatisticalLearningEngine, MillDeepLearningEngine, MillNeuralNetworkEngine, AIResourceLearningEngine, CAMDeepLearningEngine, CNCControllerDeepLearningEngine, etc.) — MIT ingestion must EXTEND these, not create parallels. `/dedup` is mandatory.

---

## Strategic Course-to-Phase Mapping

Selected for direct rigor lift of Phase 0 components. Ordered by leverage.

| # | Course | Title | Feeds Into | What It Hardens |
|---|--------|-------|-----------|-----------------|
| 1 | **6.824** | Distributed Systems Engineering | **U-AWR25 + Phase 0.4** | Lamport/vector clocks, Raft/Paxos consensus, Byzantine fault tolerance, CRDTs for eventually-consistent awareness, linearizability vs sequential consistency — converts cross-terminal lockfile from ad-hoc to formally grounded |
| 2 | **6.830** / **6.814** | Database Systems | **Phase 0.7 Reverse Indexes** | ACID for forge-quint transaction, WAL for registry durability, B+ trees for cold storage, hash indexes for O(1) lookup, query planner for `impactAnalysis()`, MVCC for concurrent awareness reads |
| 3 | **6.006** + **6.046J** | Intro to Algorithms + Advanced Algorithms | **Phase 0.2 AwarenessQueryEngine** | Tries + Aho-Corasick for multi-pattern matching, bloom filters for "definitely-not" dedup prefilter, skip lists for ordered registries, union-find for alias equivalence classes, amortized analysis for <100ms query floor |
| 4 | **6.S191** + **6.036** | Intro to Deep Learning + Intro to ML | **Phase 0.2 SemanticSimilarityGuardEngine** | MiniLM/sentence-BERT embeddings (cosine >0.85 gate), HNSW for fast kNN, online learning for registry drift, active learning for borderline-semantic-dup cases, calibration to prevent false positives |
| 5 | **6.031** / **6.170** | Software Construction | **Phase 0.6 Auto-Wiring** | Representation invariants, contract programming (pre/post/invariant), dependency injection, spec-based testing for every auto-wiring hook, abstraction functions to prove registry ↔ disk equivalence |
| 6 | **6.034** | Artificial Intelligence | **Extend** TreeOfThoughtEngine, HypothesisRankerEngine, CounterfactualReasoningEngine | CSP for dispatcher wiring constraints, Bayesian nets for tip confidence, A*/IDA*/beam search for rename/delete impact planning, explanation-based learning for tribal-tip promotion |
| 7 | **6.867** | Advanced Machine Learning | **Extend** MillDeepLearningEngine, AIResourceLearningEngine | Gradient boosting for feed/speed calibration, kernel methods for material classifier, L1/L2 regularization for overfit-prevention on small JM-DIE corpus, SVM margin theory for safety-critical decisions |
| 8 | **6.804J** / **9.66J** | Computational Cognitive Science | **Extend** PRISMSelfAwarenessEngine | Metacognition (know-what-you-don't-know) for awareness-score floor, working-memory / long-term-memory split mapping to session-cache vs registry, attention models for which engines to inject per prompt |
| 9 | **18.06** | Linear Algebra | Foundational — all of above | SVD/PCA for dim-reduction on MiniLM embeddings, eigenvalue stability analysis for control-loop engines, QR/LU decomposition for regression calibration |
| 10 | **6.172** | Performance Engineering | **Phase 0.2 query hot path** | Cache-oblivious data layout for MASTER_INDEX_COMPACT, branch-prediction-friendly registry lookup, lock-free CAS primitives to complement proper-lockfile where applicable |

**Secondary tier** (ingest after MS0 if bandwidth allows): 6.042J Mathematics for CS (graph theory for dependency graph), 6.854 Advanced Algorithms (network flow for resource allocation), 6.875 Cryptography (content-hashing rigor for SIGNATURE_HASH_INDEX).

---

## Gaps Without MIT Integration

Without this layer, Phase 0 components are solid engineering but lack the following rigor:

1. **Phase 0.7 Reverse Indexes risk becoming ad-hoc JSON.** Without 6.830 rigor (ACID, WAL, MVCC), forge-quint can still produce torn writes under aggressive concurrent session use. `proper-lockfile` provides mutex but not journaling.
2. **SemanticSimilarityGuardEngine risks being a toy.** Without 6.S191 rigor (proper embedding choice, HNSW, calibration), the cosine>0.85 gate degrades to meaningless under class imbalance (99% non-dups).
3. **AwarenessQueryEngine <100ms claim is unverified.** Without 6.006 rigor (big-O analysis, amortized bounds), the Map-based lookup becomes O(N) in the tail when registry passes ~50K entries.
4. **U-AWR25 cross-terminal coordination has no formal consistency model.** Without 6.824 rigor, "eventually consistent awareness" is vibes. Need to declare: linearizable? Sequential? Causal? And prove which ops are which.
5. **PRISMSelfAwarenessEngine has no ground truth for "aware."** Without 6.804J metacognition framing, awareness score is self-reported. Need external consistency checks (6.830 audit trail).

---

## Anti-Patterns to Avoid

- **Do NOT ingest ALL MIT CS courses.** The pdf-learn pipeline pulls in every lecture regardless of manufacturing relevance. Filter: only the 9-10 courses above. 6.001, 6.004, 6.005 (other software-engineering survey) are lower leverage — skip.
- **Do NOT create `MITDistributedSystemsEngine.ts` etc.** `/dedup` first. Extend `CrossDisciplinaryDeepLearningEngine` with a `DISTRIBUTED_SYSTEMS` domain block, don't fork.
- **Do NOT let pdf-learn auto-generate engines from MIT content without review.** The pipeline's `--max-components=5` default will balloon artifact count. Run with `--dry-run` + `--tips-only` for MIT; promote specs to full engines manually after scrutiny.
- **Do NOT defer ingestion until "after Phase 0."** 6.S191 embeddings ARE a Phase 0.2 prerequisite — the SemanticSimilarityGuardEngine needs a real embedding model chosen before it ships. Sequence matters.

---

## Proposed Insertion — Phase 0.12 MIT OCW Rigor Layer

Place between Phase 0.10 (Codex adapter) and Phase 1.

**Goal:** Ingest 9 MIT courses via existing `/pdf-learn mit:<id>` pipeline BEFORE Phase 0 components ship, so their design is grounded in formal rigor rather than retrofitted.

**Units (parallelizable with Phase 0.1-0.5):**

- **U-MIT01** — Ingest 6.824 Distributed Systems → sequence: BEFORE U-AWR25 finalization. Pipes into U-AWR25 consistency-model declaration + Phase 0.4 lock semantics.
- **U-MIT02** — Ingest 6.830 Database Systems → sequence: BEFORE Phase 0.7. Pipes ACID/WAL patterns into reverse-index design.
- **U-MIT03** — Ingest 6.006 + 6.046J Algorithms → sequence: BEFORE Phase 0.2 AwarenessQueryEngine. Pipes into <100ms big-O proof.
- **U-MIT04** — Ingest 6.S191 + 6.036 ML → sequence: BEFORE Phase 0.2 SemanticSimilarityGuardEngine. Pipes into embedding-model selection (MiniLM vs MPNet) + HNSW setup.
- **U-MIT05** — Ingest 6.031/6.170 Software Construction → sequence: BEFORE Phase 0.6 auto-wiring hooks ship. Pipes rep-invariant + contract patterns into hook design.
- **U-MIT06** — Ingest 6.034 AI → sequence: parallel with Phase 0.8 (rename/delete/impact). Extends existing TreeOfThought/HypothesisRanker/Counterfactual engines with CSP + beam search.
- **U-MIT07** — Ingest 6.867 Advanced ML → sequence: parallel with Phase 0.2. Extends MillDeepLearningEngine calibration.
- **U-MIT08** — Ingest 6.804J Cognitive Science → sequence: parallel with Phase 0.6 (metacognition framing for awareness-score).
- **U-MIT09** — Ingest 18.06 Linear Algebra → sequence: foundational, do early so other units cite it.

**Execution pattern per unit:**

```
/pdf-learn mit:<id> --dry-run --tips-only           # first pass: extract tips only
# review spec, /dedup each candidate against existing engines
/pdf-learn mit:<id> --max-components=3 --domain=software   # second pass: generate 1-3 high-value components
# extend existing engines with new domain blocks; do NOT spawn parallels
```

**Exit gates:**
- Each MIT course produces ≥10 tribal tips (added to `TribalKnowledgeEngine.KNOWLEDGE_BASE`)
- Each course produces ≤3 new engines (must pass `/dedup`)
- Each course produces ≥1 extension to an existing engine (domain block added)
- Provenance logged in `extraction-log.json` with `mit:<id>` prefix
- `AwarenessQueryEngine.query("distributed systems")` returns ≥5 relevant entries post-ingest

**Artifact count delta:** +9 ingestion units, estimated +90 tips, +15-25 new engines (after dedup), +9 domain blocks in existing engines, +1 `MIT-OCW-INGEST-LOG.md`.

---

## Verdict

MIT OCW integration is NOT a new feature — it is the **rigor substrate** that converts Phase 0's ambitious components from "best-effort engineering" to "formally grounded infrastructure." The pipeline already exists. The cost is ingestion bandwidth (≈1 day parallel with U-AWR25); the benefit is that every Phase 0 component ships with citations, formal consistency models, and proven algorithms instead of reinvented ones.

**Build order update:**

1. **U-AWR25** (cross-terminal coordination)  ← in flight
2. **Phase 0.12 U-MIT01 + U-MIT09** (6.824 + 18.06)  ← unblock U-AWR25 rigor
3. **Phase 0.1** (dedup enforcement PreTool)
4. **Phase 0.12 U-MIT03 + U-MIT04 + U-MIT02** (6.006 + 6.S191 + 6.830)  ← unblock Phase 0.2 + 0.7
5. **Phase 0.2** (5 awareness engines with MIT-grounded internals)
6. **Phase 0.12 U-MIT05** (6.031)  ← unblock Phase 0.6
7. **Phase 0.3-0.6** (forge-quint, locking, un-hardcoding, auto-wiring)
8. **Phase 0.12 U-MIT06 + U-MIT08** (6.034 + 6.804J)  ← extend existing engines
9. **Phase 0.7-0.11** (reverse indexes, rename/delete, orphan, Codex)
10. Phase 1-4 (skills, scripts, remaining hooks)

Without Phase 0.12, Phase 0 ships at ~70% rigor. With it, ~95%.
