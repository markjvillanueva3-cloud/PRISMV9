# PRISM Full-Fleet Coordination — Self-Improving Multi-Domain AI Loop

**Author:** slot:india `claude-e9b04a0e` (coordinator), 2026-05-25
**Status:** ACTIVE master spec — supersedes single-domain training-substrate work
**Scope:** every PRISM domain chat running NN+GNN+deep-learning+deep-reasoning+LoRA+RAG+hybrids in a revolving self-improving loop. India coordinates; india does not implement domain-internal models.

## 1. The system in one diagram

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │                                                                       │
  │   13 DOMAIN CHATS — each owns its NN+GNN+LoRA+RAG+reasoning stack    │
  │                                                                       │
  │   charlie  wire/WEDM        delta    CAD              echo   CAM     │
  │   foxtrot  mill+tribal      hotel    ERP/HR/portal    kilo   p2p     │
  │   mike     misc/orphans     whiskey  lathe            papa   NN/GNN  │
  │   sierra   /system-viz      quebec   quality/SPC      tango  obs     │
  │   oscar    orchestration                                              │
  │                                                                       │
  └────────────────────┬─────────────────────────────────────────────────┘
                       │ emit OutcomeLedgerRecord JSONL (per-domain)
                       │   - {observed_at, shop_id, category, domain,
                       │      estimated, actual, unit, s_of_x?}
                       ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  SHARED SUBSTRATE (already shipped 2026-05-25, slot:india)            │
  │                                                                       │
  │  ShopOutcomeIngestProcessorEngine   reads any JSONL, emits sink       │
  │  PSNSelfImprovingLoopEngine         CoV verify + adapter fold + psi   │
  │  ShopProfileAdapterEngine           per-shop EWMA calibration         │
  │  ChainOfVerificationEngine          claim verification primitive      │
  │  PSNAutonomyLoopEngine              psi_delta accumulator / reward    │
  │  prism_shop:loop_shop_summary       MCP read-side                     │
  │  prism_shop:loop_shop_deltas        MCP read-side                     │
  │  GraphSAGE tier-5 (AUROC 0.6129)    embedding-coverage fix shipped    │
  └────────────────────┬─────────────────────────────────────────────────┘
                       │ per-shop deltas + per-domain psi_delta accumulator
                       ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  INDIA (coordinator) — deep research + envelope + synergy             │
  │                                                                       │
  │  - Reads aggregate signal (AUROC, psi_delta, per-shop drift)          │
  │  - Identifies cross-domain pattern gaps                               │
  │  - Writes R-series research specs (R3, R4 today → R5..)               │
  │  - Issues per-domain milestone envelopes                              │
  │  - Maintains contracts (OutcomeLedgerRecord, dispatcher actions)      │
  │  - DOES NOT IMPLEMENT domain-internal models                          │
  └────────────────────┬─────────────────────────────────────────────────┘
                       │ envelope updates + research-spec deltas
                       ▼
              [back to 13 domain chats — REVOLVING LOOP]
```

## 2. Per-domain assignment (13 chats × full AI stack)

Each chat builds the full stack listed in §3 against its named domain. Names assigned by observed slot-activity + soul + CLAUDE.md §JULIETT-12CHAT.

| Slot | Domain | Existing seed | Loop status (today) |
|---|---|---|---|
| **charlie** | wire/WEDM + cross-domain reasoning bridge | `WireEDMDeepReasoningEngine`, `ChainOfVerificationEngine` (5/25) | `2d29d422` QUOTING-COMPLETENESS / DEEP-REASONING-BRIDGE |
| **delta** | CAD + corpus-100k training | `5815c28b` CAD-corpus GNN/NN/LoRA active | building |
| **echo** | CAM + toolpath AI | `CAMTribalRAGEngine`, CAM bridges | needs envelope |
| **foxtrot** | mill + tribal knowledge | `b509cb68` MILL-PROGRAM-AI active, `MillLoRATribalAugmentationEngine` | building |
| **hotel** | ERP + HR + employee-mobile-portal | `EmployeeShopFloorMobileEngine` + 43 emp_* actions | `23da5f50` /goal active |
| **kilo** | print-to-program (p2p) + part-library | `b2bcf85e` PSN-SYNERGIZE, p2p substrate trio (5/24) | building |
| **mike** | misc / orphan domains / catch-all | `JMDieLatheCapabilityEngine` (5/24) | available |
| **whiskey** | lathe + lathe AI training | `8c21a1d8` lathe AI-training active, `LatheLoRATribalAugmentationEngine` | building |
| **papa** | NN/GNN core training + bridges | engine-wiki embedder (5/24), NN-GRAPH-MS2 retrain lifecycle | building |
| **sierra** | /system-viz + ghost roosts + visualization | system-viz close-outs (5/22 /goal-21) | building |
| **quebec** | quality + SPC + Cpk surrogate | `LatheTurningCpkSurrogateEngine` (CoV-queued) | needs envelope |
| **tango** | telemetry + observability + metrics | route-savings telemetry, hook health-check infra | needs envelope |
| **oscar** | orchestration + multi-agent + consensus | `MultiAgentCoordinatorEngine`, U-SHOP-WIRE 5/22 | needs envelope |

india herself: **coordinator** — research/envelope/synergy. NO domain-internal models. Drops the post-processor domain (passed to a future slot, or absorbed into the post-processor side of `echo`/`mike`).

## 3. The full AI stack each domain chat builds

```
                    ┌──── DATA LAYER ────┐
                    │  domain ledger     │  per-domain outcome history
                    │  (JSONL emit)      │  → feeds india's processor
                    └────────┬───────────┘
                             ▼
   ┌─────────────────────────────────────────────────────────┐
   │  STACK (each domain chat owns ALL 8 layers internally)  │
   │                                                          │
   │  1. RAG INDEX           per-domain Qdrant + BM25 hybrid │
   │  2. RAG VARIANTS        basic + GraphRAG + hierarchical │
   │                         + late-interaction (ColBERT)     │
   │  3. NEURAL NETWORK      classification / regression head │
   │                         on top of domain embeddings      │
   │  4. GRAPH NN            HGT preferred over GraphSAGE     │
   │                         (heterogeneous L1-L11 + status) │
   │  5. DEEP LEARNING       transformer fine-tuning per     │
   │                         domain corpus (Axolotl/unsloth) │
   │  6. LoRA ADAPTER        parameter-efficient per-domain  │
   │                         (S-LoRA stack across domains)   │
   │  7. DEEP REASONING      CoV verify + Plan-and-Solve +    │
   │                         Tree-of-Thought + Best-of-N      │
   │  8. CUSTOM ALGORITHMS   domain-specific physics + tribal │
   │                         + engine compositions            │
   │                                                          │
   └─────────────────────────────────────────────────────────┘
                             │
                             ▼ outcomes
                       (back to data layer →)
```

The 8 layers are **non-negotiable** — every domain ships all 8 OR explicitly notes which are deferred. The minimum-viable shape for layer N is named in §6.

## 4. The revolving self-improving loop (cadence)

```
Hour 0      All 13 domains tick their /loop iter, emit outcomes JSONL
Hour 0..1   india ShopOutcomeIngestProcessor consumes all 13 ledgers
            → per-domain psi_delta computed → per-shop deltas updated
Hour 1      india writes weekly /system-viz roost snapshot (sierra hosts)
Hour 1..3   GraphSAGE / HGT retrain triggered by NN-GRAPH lifecycle
            (papa owns; gates on AUROC ≥ 0.78, macro-F1 ≥ 0.55, Brier ≤ 0.15)
Hour 3      india reads retrain result. If promoted → broadcast to fleet.
            If not promoted → diagnose (data-side vs architecture-side gap)
Hour 3..6   india updates R-series spec OR drafts new envelope based on
            cross-domain gap (e.g. "CAD outcomes show feature-recognition
            drift not captured in lathe outcomes → propose joint-training
            envelope for delta+whiskey")
Hour 6      Envelope sync — affected domain chats pick up updated unit list
[REPEAT]
```

The cadence is asynchronous (each chat ticks /loop on its own clock). India is the **only synchronization point** — and it's a lightweight one (chat-bus + spec writes, not blocking coordination).

## 5. India's coordination cadence (specific responsibilities)

Per /loop iter (when india's iter fires):

1. **Read AGENT_CHAT.jsonl** — surface unread peer messages (`prism_chat_unread > 0`)
2. **Read 13 most-recent peer handoffs** — `HANDOFF-<peer>-<topic>.md` per slot
3. **Pull aggregate signal** — `prism_shop:loop_shop_summary` for jm-die (and other registered shops), `NN-EVAL.json` for AUROC trajectory, `state/shared/PSN-LEG-STATE.json` for leg health
4. **Identify cross-domain gaps** — patterns visible across ≥2 domains' outcomes that no single domain chat would surface
5. **Write one of:**
   - R-series research spec update (`PSN-INCORPORATION-RESEARCH-R<N>-*.md`)
   - Per-domain envelope (under `mcp-server/data/roadmap/atomic-units/<DOMAIN>-MS<N>/`)
   - Contract update (e.g. extending `OutcomeLedgerRecord`)
   - Coordination broadcast (chat-bus post + this spec edit)
6. **Tick the loop** — `loop-state.mjs tick --note "<one-line>"` with the named output
7. **NEVER implement domain-internal NN/GNN/LoRA code** — that's per-domain ownership. india writes specs + reviews + dispatches reviewer agents.

If india notices a domain chat is stalled (no commits in 24h, no /loop tick in 12h) → post coordination request to that slot via chat-bus, NOT take over their work.

## 6. Per-layer minimum-viable shape (the contract each domain ships against)

### Layer 1 — Data layer (outcome ledger)
- JSONL at `state/shared/training/<domain>-outcomes.jsonl` (or per-shop subdir)
- Schema: `OutcomeLedgerRecord` from `PSN-SELF-IMPROVING-LOOP-COORDINATION-CONTRACT-2026-05-25.md`
- Append-only; rotate weekly via cron (`scripts/training-ledger-rotate.mjs` — TODO, tango owns)

### Layer 2 — RAG
- Qdrant collection `<domain>-knowledge` (e.g. `lathe-knowledge`, `cad-knowledge`)
- BM25 sparse index alongside (Qdrant supports hybrid natively)
- Variants required:
  - Basic dense retrieval
  - GraphRAG over the domain subgraph in `/system-viz`
  - Hierarchical (parent-doc retrieval)
- Embeddings via `nomic-embed-text` (768-d) — same model as the NN feature embedder, so retrieval space = NN feature space (the iter4 embed-coverage fix benefits everyone)

### Layer 3 — Neural network (per-domain head)
- Input: domain embedding (768-d) + outcome features (categorical one-hot)
- Output: predicted outcome (regression) OR classification (e.g. "this CAD feature will need recut")
- Storage: `state/shared/training/<domain>-nn-checkpoint.json`

### Layer 4 — Graph NN
- HGT preferred over GraphSAGE per R4 #9 (heterogeneous L1-L11 graph + status types)
- Per-domain subgraph extracted from `/system-viz/system-graph.json` (papa owns the master graph; domains read their subgraph)
- Promotion gates: AUROC ≥ 0.78, macroF1 ≥ 0.55, Brier ≤ 0.15

### Layer 5 — Deep learning (domain transformer)
- Base: `qwen2.5-coder:3b` (fast) or `:7b` (when needed)
- Fine-tune: domain corpus → JSONL → Axolotl/unsloth
- DPO/KTO pairs from JM-Die outcomes (R3 pick #9, 2-week build, JM-Die canonical)
- STaR bootstrap from domain reasoning traces (R3 pick #10, 1-month, deepest per-domain)

### Layer 6 — LoRA adapter
- Per-domain LoRA on top of layer-5 model
- S-LoRA stack (Sheng 2024) — one adapter per domain, dynamic loading
- Storage: `state/shared/training/lora/<domain>-r16.safetensors`
- Training trigger: when domain ledger crosses 1000 outcomes OR weekly cron, whichever first

### Layer 7 — Deep reasoning
- CoV substrate already shipped (this session) — wrap your domain safety/accuracy gates via `ChainOfVerificationEngine.verify(claim, questions, verifier)` per the 6 queued wrappers in `[[reference_cov_engine_2026_05_25]]`
- Plan-and-Solve wrapper around `prismCreativeReasoningEngine.explore("optimal")` (R3 pick #2, 1d)
- PoT/PAL via `prism_calc` (R3 pick #3, 1d)
- Best-of-N + ORM rerank for high-stakes outputs (R3 pick #4, 3d)

### Layer 8 — Custom algorithms + engines
- Domain physics (Kienzle for mill, Taylor for lathe wear, Konig-Wee for WEDM, etc.) — **always** reference `mcp-server/src/physics/constants.ts` per CLAUDE.md safety rail
- Domain-specific composition engines (e.g. `MillingDeepReasoningEngine` + `MillLoRATribalAugmentationEngine` for foxtrot)

## 7. Cross-domain integration patterns (the synergy india manages)

| Pattern | Producers | Consumers | India role |
|---|---|---|---|
| **Outcome-feedback** | all 13 | shared substrate | enforce schema, surface schema-violations on chat-bus |
| **Shared embedding space** | papa (master embed) | all 13 RAG layers | propose model upgrades (R5) |
| **Joint-training** | pairs of related domains (e.g. delta+echo CAD→CAM) | both | author joint-training envelopes |
| **Cross-domain RAG** | any peer asks about another domain | RAG layer 2 must support cross-collection query | spec the federated-retrieval contract |
| **Tribal-knowledge propagation** | foxtrot (mill-tribal) | all machining domains | spec promotion rules tribal→wiki→training data |
| **Verifier composition** | charlie (CoV substrate), per-domain verifiers | layer 7 of every chat | maintain canonical CoV usage examples |
| **PSN psi_delta accumulator** | all 13 | `PSNAutonomyLoopEngine` | track fleet-wide reward trajectory |

## 8. Open envelopes india will draft (next 5 iters)

1. **`AI-STACK-PER-DOMAIN-MS0`** — 8-layer envelope template instantiated per domain (13 envelopes, ≤20 units each). Affects all 13 chats.
2. **`HGT-MIGRATION-MS0`** — papa-led, replaces GraphSAGE tier-5 with HGT. R4 pick #9. 3 weeks, expected +3-5% AUROC.
3. **`CROSS-DOMAIN-RAG-FEDERATION-MS0`** — federated-retrieval contract across `<domain>-knowledge` collections.
4. **`S-LORA-DOMAIN-STACK-MS0`** — dynamic LoRA loading + adapter registry. R3 pick #1C.
5. **`OUTCOME-LEDGER-ROTATION-MS0`** — tango-owned cron + retention policy. Required before fleet-wide training stabilizes.

## 9. Anti-patterns india prevents

- **Domain chat reinvents the substrate** — every domain chat MUST compose `PSNSelfImprovingLoopEngine`, not write its own. India enforces via /pre-build review.
- **Outcome schema drift** — every emit must conform to `OutcomeLedgerRecord`. Non-conforming emits get a chat-bus rejection note from india.
- **Cross-domain silent re-derivation** — if delta builds a "CAD-feature-recognizer NN" and foxtrot starts to build a "CAD-feature-recognizer NN" too, india surfaces it within 1 /loop iter.
- **Inlined physics constants** — already a hard hook block; india reviews per the canonical constants.ts contract.
- **Bypassing CoV for safety-critical gates** — every safety gate at the AI layer must verify-via-CoV. india writes one example per domain.

## 10. Reflexive consistency — india also coordinates india

- india's coordination spec (this file) gets reviewed by a peer reviewer agent every 5 iters
- india's R-series specs feed back into india's planning (R3 → R4 → R5)
- india's envelope drafts get triple-scrutiny (Codex + 2 Claude reviewers) per CLAUDE.md §SCRUTINY GATE before broadcast
- india's own /loop ticks count toward fleet psi_delta — coordinator work is real work

## References

- Substrate: `PSN-SELF-IMPROVING-LOOP-COORDINATION-CONTRACT-2026-05-25.md` (already shipped)
- Substrate memos:
  - `[[reference_psn_self_improving_loop_ms0_iter1to3_2026_05_25]]`
  - `[[reference_cov_engine_2026_05_25]]`
  - `[[reference_psn_training_substrate_2026_05_25]]`
  - `[[reference_psn_r4_deep_stack_2026_05_25]]`
- 11-leg PSN map: `[[feedback_psn_definition]]`
- Slot-domain matrix: CLAUDE.md §JULIETT-12CHAT-ALLOCATION-MS0
- Doctrine: `[[deep-reasoning-doctrine]]` (model ladder L0..L3)

---

**Broadcast plan:** this spec + a per-domain coordination message gets posted to `AGENT_CHAT.jsonl` so the 13 named chats see their assignment + the 8-layer contract in one shot. India's first 5 envelopes (§8) ship over the next /loop iters.

**Reflexive check:** if a peer disagrees with their assignment or the 8-layer contract, post on `AGENT_CHAT.jsonl` and india reconciles within 1 /loop iter — coordination is consensual, not imposed.
