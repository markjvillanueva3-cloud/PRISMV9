---
name: reference-hermes-psn-rag-synergy-research-2026-05-23
description: Hermes × PSN × RAG synergy — 7×11 matrix of Hermes closed-loop stages vs PSN legs identified 4/7 decision stages (cluster/dedup/promote/draft) use ZERO RAG against ANY PSN leg today. 7 candidate units U-HRP01..07; P0 wave (cluster/propose/dedup RAG) in skill-loop-pipeline.mjs.
aliases: [hermes-psn-rag-synergy-research, Hermes PSN RAG Synergy Research, reference-hermes-psn-rag-synergy-research-2026-05-23]
metadata:
  type: reference
  date: 2026-05-23
  slot: bravo
  spec_file: state/shared/specs/HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23.md
---

# Hermes × PSN × RAG synergy research — 2026-05-23 (slot bravo)

## What this is

Deep-research deliverable extending the prior Hermes work. Operator directive: *"do more deep research on hermes synergizing with PSN + RAG"*. Spec at `state/shared/specs/HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23.md`.

## Core finding

**Today RAG and Hermes are wired VERTICALLY only:** Hermes runtime calls PSN dispatchers; PSN dispatchers expose `rag_rerank` (3 surfaces post 2026-05-22/23: `prism_ml` canon + `prism_ai` + `prism_operating_system`). RAG coverage at the dispatcher level is now 11/11 PSN legs.

**The horizontal wiring is missing:** Hermes' own pipeline (`scripts/lib/skill-loop-pipeline.mjs`) has 4 decision stages — cluster / propose / dedup / promote — and a 7×11 matrix of (stage × PSN-leg × RAG-use) shows **0 of 4 decision stages use RAG against ANY PSN leg today**. The substrate is queried by operators and auto-injectors; never by Hermes itself when deciding what to ship.

## The 7 proposed adoption units

| Unit | Stage | PSN legs | Priority | Closes |
|---|---|---|---|---|
| **U-HRP01** | S2 cluster | 3 wiki, 4 mem, 5 tribal | P0 | False-cluster rate (signature-substring → semantic) |
| **U-HRP02** | S3 propose | 5 tribal, 3 wiki | P0 | Stub-body problem (G5 leak from HERMES-OBSIDIAN-OS) |
| **U-HRP03** | S4 dedup | 3 wiki, 4 mem | P0 | G6 leak properly (Jaccard → semantic rerank) |
| **U-HRP04** | S5 promote | 6 sysviz, 10 NN | P1 | Finishes G13 NN-scoring scope (RAG-as-policy) |
| **U-HRP05** | S7 learn | 1 obsidian, 4 mem | P1 | Soul evolves from session corrections |
| **U-HRP06** | S7 learn | 3 wiki | P2 | Memory → wiki promotion advisory |
| **U-HRP07** | S3 propose | 11 PRISM AI | P3 | AI-generated draft bodies (depends on P0+budget) |

## P0 wave — what to actually ship first

Three units in `scripts/lib/skill-loop-pipeline.mjs`, all calling `prism_ai:rag_rerank`:
1. **Cluster RAG** — `clusterCandidates` adds semantic rerank against wiki + memory + tribal corpora; clusters only when signature AND semantics match.
2. **Propose RAG** — `shipDraft` writes a staging spec with adjacent tribal exemplars + nearest existing skills embedded inline; operator promotes 5-10× faster.
3. **Dedup RAG** — `gateCandidate` semantic rerank against the full skill library catches paraphrased duplicates Jaccard misses.

Estimated effort: ~150-200 LOC + tests per unit; all 3 in one bravo /loop session.

## Cost model

`rag_rerank` is already-deployed and benchmarked at 5-20ms / call. Adding ≤4 rerank calls per Stop hook adds ~80ms — below current Stop-hook noise (1-2s). Embedding indexes (tribal-embed-index.json, wiki vector index) are reused — **no new embedding compute for P0**. U-HRP07 is the only token-meaningful unit; deferred to P3 so cost is measured against P0 proven benefit.

## Risks named + mitigated in spec

1. Vector staleness when skills deleted → tie embedding refresh to /dedup or skill-list rebuild
2. Hallucinated similar-matches → AUTO-FAIL rerank below floor 0.3; fall back to signature path; log every fallback (R12)
3. AI-generation cost spike (U-HRP07 only) → per-day budget cap knob
4. Soul over-fitting → reuse `medianCallCount ≥ 6 ∧ ≥ 2 slots` threshold

## How this connects to recent work

- **RAG-UPGRADE-MS0** (golf, prior days) — wired RAG vertically. Now 11/11 PSN-leg coverage.
- **U-RAG-PSN-AI-WIRE** [[reference_u_rag_psn_ai_wire_2026_05_22]] — 11th PSN leg
- **U-RAG-PSN-OS-WIRE** [[reference_u_rag_psn_os_wire_2026_05_23]] — 2nd PSN leg
- **HERMES-MS0+MS1** [[reference_hermes_zulu_ms0_2026_05_20]] — vertical Hermes wiring (souls, observation, cluster→ship)
- **HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20** — Obsidian-as-OS framing; named the G5/G6/G13 leaks
- **HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20** — 9 Hermes patterns adopted/exceeded

## How this differs from prior Hermes research

Prior research (2026-05-17 + 2026-05-20 spec pair) closed the **vertical** gaps — souls layer, closed-loop publication pipeline, Obsidian-as-OS substrate alignment. This spec is **horizontal** — every Hermes stage routes through RAG against the PSN substrate. Different axis; complementary, not duplicative.

## Doctrine alignment

- `feedback_psn_definition` — explicit 7×11 mapping is exactly what "synergize PSN" means.
- `feedback_reflect_all_changes_post_update` — every U-HRP that ships updates 4 surfaces.
- CLAUDE.md §PER-FILE [[project_scrutiny_gate|SCRUTINY GATE]] — multi-file P0 wave requires per-file scrutiny.
- R12 (fail-loud) — every RAG call has a fallback path; every fallback logged.

## Not in scope

- Multi-language embedding (English-only doctrine).
- Vector store migration to qdrant (RAG-UPGRADE-MS1 territory).
- Cross-session reranker training from operator promote/reject (RGS / NN-GRAPH territory).
- Inline RAG at observation time (S1) — kept fire-and-forget by design.

## Next action

Operator picks U-HRP units to enqueue. P0 wave (HRP01+02+03) is the recommended first batch — one bravo /loop session. Spec is operator-reviewable; nothing shipped yet.

## Cross-refs

- Spec: `state/shared/specs/HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23.md`
- [[reference_hermes_zulu_ms0_2026_05_20]] — vertical-Hermes ship
- [[reference_u_rag_psn_ai_wire_2026_05_22]] — RAG leg #11
- [[reference_u_rag_psn_os_wire_2026_05_23]] — RAG leg #2
- [[feedback_psn_definition]] — the 11 legs
- [[reference_zpsn03_target_parser_2026_05_23]] — most recent prior bravo Hermes work
