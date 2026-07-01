# HERMES + PSN + RAG — deep-synergy research deliverable

**Date:** 2026-05-23 · **Slot:** bravo (`claude-ea80ce2f`) · **Triggers prior:** [HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md](HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md) + [HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md](HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md) + [HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20.md](HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20.md) + [RAG-UPGRADE-MS0.md](RAG-UPGRADE-MS0.md).

Operator directive (2026-05-23, post-/checkin-bravo zebra-activation): *"do more deep research on hermes synergizing with PSN + RAG"*.

The prior Hermes deliverable (HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20) framed Obsidian-as-OS. The two RAG-PSN wires (U-RAG-PSN-AI-WIRE 2026-05-22 + U-RAG-PSN-OS-WIRE 2026-05-23) closed RAG-leg coverage 10/11 → 11/11 — every PSN-leg dispatcher can now call `rag_rerank`. **That's the vertical wiring.** This spec is the **horizontal wiring** — when Hermes (the runtime: observe → cluster → propose → dedup → promote → dispatch → learn) operates ON PSN, *which steps route through RAG, and which don't?* Today: nearly none. That's the compounding-gap this deliverable measures and proposes adoption units for.

---

## 0. The current state as a 1-line ASCII

```
Hermes runtime ── calls ──▶ PSN dispatchers ── exposes ──▶ rag_rerank (3 surfaces: prism_ml | prism_ai | prism_operating_system)
   ▲                                                                  │
   └───────────────── DOES NOT USE INTERNALLY ───────────────────────┘
```

Hermes' closed-loop pipeline (`scripts/lib/skill-loop-pipeline.mjs`) uses:
- **clustering:** signature-substring of tool-call sequences (`Read|Edit|Bash:vitest|Bash:git`).
- **dedup:** Jaccard over keyword tokens of frontmatter (G6 fix).
- **promotion gate:** median callCount ≥ 6 ∧ ≥ 2 slots.
- **shipDraft body:** static stub template (`buildStubBody`).

None of those four stages query the reranker against the existing PSN substrate. The substrate is queried by the operator (via `/wiki-query`, `/memory-search`, `/master-index`) and by auto-injectors (`memory-relevance-inject`, `wiki-precheck-inject`, `tribal-by-domain-inject`, `master-index-precheck-inject`). **Not by Hermes itself when it's deciding what to ship.** That's the gap.

---

## 1. The thesis in one sentence

**Hermes is the runtime; PSN is the substrate; RAG is the retrieval layer between them. The MS0+MS1 work wired Hermes vertically — it can WRITE to PSN (publish skills to `.claude/commands/`) and READ from PSN (observe skill use). RAG-UPGRADE-MS0 + the two PSN-leg wires made `rag_rerank` callable from every PSN dispatcher. The remaining compounding-capability lever is HORIZONTAL: rewire Hermes' four pipeline stages (cluster / dedup / promote / draft) to route through RAG against the 11 PSN legs, so every closed-loop decision is grounded in the *full* knowledge substrate, not in tool-call substrings.**

---

## 2. The 3D synergy matrix

**Rows** = Hermes closed-loop stages (7 stages from observation to re-observation).
**Cols** = PSN legs (1–11 per [`feedback_psn_definition`]).
**Cell** = Does Hermes use RAG to query *this leg* at *this stage*?

Legend: ✅ wired · ⚠️ partial · ❌ empty · — not applicable

| Hermes stage ↓ \ PSN leg → | 1 Obsidian | 2 PRISM-OS | 3 Wiki | 4 Memories | 5 Tribal | 6 SysViz | 7 Engines | 8 Algos | 9 Formulas | 10 NN/GNN | 11 PRISM AI |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S1 observe** (`skill-candidate-observe.mjs` Stop hook) | — | — | — | — | — | — | — | — | — | — | — |
| **S2 cluster** (`clusterCandidates`) | ❌ | — | ❌ | ❌ | ❌ | ⚠️* | — | — | — | ❌ | ❌ |
| **S3 propose** (`buildStubBody`) | ❌ | — | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | ❌ | ❌ |
| **S4 dedup** (`gateCandidate`) | ❌ | — | ❌ | ❌ | ❌ | ❌ | — | — | — | ❌ | ❌ |
| **S5 promote** (callCount + slot threshold) | — | — | — | ❌ | — | — | — | — | — | ❌ | — |
| **S6 dispatch** (`/skc-xxxx` invocation) | — | ✅† | — | — | — | — | ✅ | ✅ | ✅ | — | ✅ |
| **S7 learn** (re-observe + memory promotion) | ⚠️‡ | — | ❌ | ⚠️‡ | ❌ | ❌ | — | — | — | ❌ | ❌ |

\* Cluster stage *reads* one PSN-leg signal (`recentActivity` in `chatPressure`), but doesn't RAG-search the graph.
† Live skills naturally dispatch to PRISM-OS / Engines / Algos / Formulas / PRISM-AI as they execute — that's downstream of Hermes, not Hermes' own substrate use.
‡ Memory + obsidian get auto-fed BY Stop hooks, but Hermes doesn't QUERY them for its own decisioning.

**Net:** of 77 cells (7 stages × 11 legs), **only 5 are filled** — and 4 of those are downstream-dispatch artifacts, not Hermes-runtime synergy. **0 of the 4 decision-making stages (S2-S5) use RAG against ANY PSN leg today.** Every empty cell with a `❌` is a potential adoption unit; every cell with `⚠️` is an existing surface that could be tightened to RAG.

---

## 3. The seven concrete synergy units

Numbered in **adoption-order priority** (P0 first), not in cell-grid order. Each unit names its target cells.

### U-HRP01 — Semantic cluster (P0, biggest false-positive killer)

**Target cells:** S2 × legs 3 (Wiki), 4 (Memories), 5 (Tribal).
**Problem today:** `clusterCandidates` hashes tool-call signatures (`Read|Edit|Bash:vitest|Bash:git`). Two observations with the same signature cluster together regardless of the actual *task* the operator was doing. A `Read+Edit+Bash:git` signature could be "refactor a test file" OR "rename a CLAUDE.md section" OR "fix a wiki link" — three completely different candidate skills, but Hermes thinks they're one.
**Fix:** add a `semanticSummary` field to each candidate (the first 200 chars of the prompt that led to the observation, lightly normalised). On cluster, RAG-rerank the candidate set's `semanticSummary` fields against each other PLUS against the existing wiki + memory + tribal corpora. Two candidates cluster only if they're within both signature-distance AND semantic-distance of each other. Drops false-cluster rate; the cluster that remains is now grounded in a verifiable PSN substrate signal.
**Surface:** `scripts/lib/skill-loop-pipeline.mjs::clusterCandidates` calls `reRankerEngine.rerank` against PSN-leg corpora; the existing 3 RAG surfaces (`prism_ml` / `prism_ai` / `prism_operating_system`) are all equivalent — pick `prism_ai:rag_rerank` (Hermes operates AT the AI tier).
**Test floor:** ≥3 spanning signature classes × ≥2 semantic clusters per signature class = 6+ test cases.
**Closes:** G6 leak from HERMES-OBSIDIAN-OS §3 *properly* — current G6 fix is Jaccard over frontmatter keywords; this upgrades to semantic rerank against the actual skill bodies + tribal + wiki + memory.

### U-HRP02 — Tribal-grounded propose (P0, body-quality compounding)

**Target cells:** S3 × leg 5 (Tribal) + leg 3 (Wiki).
**Problem today:** `buildStubBody` writes a static template ("# /skc-xxxx — generated stub..."). The template has no tribal-knowledge grounding — the operator has to author the real body from scratch. Hermes proposes; it does not draft.
**Fix:** before `shipDraft` writes the staging-area markdown (G5 destination), RAG-rerank the candidate's `semanticSummary` against the tribal corpus (3919 tips) AND the existing skill library (700 skills) for top-3 nearest exemplars. Render the staged spec with a "## Closest existing references" section that surfaces those 3+3 exemplars. The operator promotes from the staged spec to a real skill 5-10× faster because the relevant tribal grounding is already adjacent.
**Surface:** `skill-loop-pipeline.mjs::shipDraft` calls `prism_ai:rag_rerank` twice (tribal + skill catalog) and concatenates the results into the staged spec body.
**Doctrine alignment:** matches Karpathy LLM-wiki pattern — every staged proposal cites its tribal + wiki ancestry, so the operator can verify provenance.
**Test floor:** ≥3 tribal-rich domains (mill, lathe, wedm) × ≥2 candidate types per domain.

### U-HRP03 — Semantic dedup (P0, closes G6 leak properly)

**Target cells:** S4 × legs 3 (Wiki) + 4 (Memories).
**Problem today:** the G6 patch from the gap audit moved dedup from `signature.includes(skillName)` to Jaccard over frontmatter trigger keywords. Better, but keyword Jaccard misses paraphrased duplicates (skill A's description says "rebuild engine index"; skill B says "regenerate ENGINE_DIGEST" — same intent, no token overlap).
**Fix:** for every candidate, after gateCandidate's existing Jaccard pre-filter, call `prism_ai:rag_rerank` against:
- (a) the full skill catalog (~700 frontmatter descriptions)
- (b) the wiki entries tagged `type: pattern` (existing reusable knowledge)
- (c) the memory namespace `feedback` (operating doctrine that might *already* dictate the proposed behaviour)
If the top-3 rerank score crosses a threshold (`KEYWORD_OVERLAP_THRESHOLD` analog, `SEMANTIC_OVERLAP_THRESHOLD=0.75`), mark `AUTO-FAIL: conflict:semantic-overlap=<score>:<name>`. Operator override remains.
**Test floor:** ≥3 known-duplicate pairs from the existing skill catalog (paraphrased descriptions) + ≥3 known-novel pairs that must NOT trigger.

### U-HRP04 — Awareness-RAG decision (P1, finishes G13 NN-scoring scope)

**Target cells:** S5 × legs 6 (SysViz) + 10 (NN/GNN).
**Problem today:** G13 closed `awarenessLookupSlot(slot).queueLength` into the orchestrator decision, but the awareness fingerprint has 8+ dimensions (`pressureSignals`, `recentActivity`, `domainAffinity`, etc.). Today only `queueLength` matters.
**Fix:** before `planSlotAction` picks an action, RAG-rerank the current slot's fingerprint against the ZEBRA-AWARENESS historical fingerprint corpus (already on disk from the training pass). The rerank returns the top-K most-similar prior-decisions; the orchestrator picks the action most-similar prior-decisions took. **This is RAG-as-policy** — Hermes' decision-making routes through the prior-decision substrate, with PSN leg #10 (the NN/GNN tier-5) as the scoring backbone.
**Test floor:** ≥3 spanning fingerprint classes × ≥2 decisions per class.

### U-HRP05 — Soul evolves from observed feedback (P1)

**Target cells:** S7 × legs 1 (Obsidian) + 4 (Memories).
**Problem today:** slot souls (3 shipped) are STATIC files. The voice/tone/refuse_list never updates from observed operator interactions. If bravo gets corrected 10 times for inlining a constant, the soul's `refuse_list` doesn't grow.
**Fix:** on every Stop, RAG-rerank the session's correction signal (any `feedback_*` memory written during the session) against the slot's current soul `refuse_list`. If the correction is semantically novel (rerank score < 0.5 vs every existing refuse-rule), append a candidate rule to a `state/shared/slot-souls/<slot>.draft.md` companion file. Operator promotes from draft to live. Closed loop, same shape as the skill-candidate one.
**Test floor:** ≥3 spanning slots × ≥2 correction-classes per slot. Requires the prior `slot-soul-inject` hook to be live (which it is, U-HERMES02).

### U-HRP06 — Memory → wiki promotion uses RAG (P2)

**Target cells:** S7 × leg 3 (Wiki).
**Problem today:** PRISM's promotion path (feedback memory → reference memory → wiki entry) is *manual*. A feedback memory's relevance to existing wiki entries is operator-judged.
**Fix:** for any new `feedback_*.md` memory written in a session, run RAG-rerank against the wiki's `lessons/` + `architecture/` + `patterns/` corpora. If top-3 score > 0.6, surface a Stop-hook advisory: "this feedback memory is semantically near `wiki/architecture/X.md` — consider promoting / merging". Operator decides. This makes the wiki *self-organizing* — RAG knows which wiki entry a new lesson belongs near.
**Surface:** new `.claude/hooks/stop-memory-to-wiki-suggest.mjs` (T3 advisory; pattern matches `stop-bug-finding-wiki-gate.mjs`).
**Test floor:** ≥3 known feedback→wiki pairs.

### U-HRP07 — Skill draft body uses PRISM-AI generation (P3)

**Target cells:** S3 × leg 11 (PRISM-AI).
**Problem today:** the `buildStubBody` template is static. U-HRP02 above adds tribal/wiki exemplars but the *body* the operator writes from scratch.
**Fix:** for a staged candidate whose top-3 RAG matches from U-HRP02 are all above a quality threshold (e.g. ≥0.8 rerank score), call `prism_ai` with the matched exemplars as few-shot context and request a draft body. Operator still gates promotion — Hermes' draft is a *starting point*, never a published skill.
**Why P3 not P0:** depends on U-HRP02 + U-HRP03 landing first; depends on the AI generation budget being acceptable; LOW-token wins from U-HRP01/02/03 should be measured before adding a generation cost.
**Test floor:** ≥3 spanning skill-classes × manual quality review.

---

## 4. The closed loop with PSN+RAG synergy — diagram

```
                            ┌─────────────────────────────────────────────────┐
                            │  PSN substrate (11 legs)                        │
                            │                                                 │
                            │  1 Obsidian   2 PRISM-OS    3 Wiki              │
                            │  4 Memories   5 Tribal      6 SysViz            │
                            │  7 Engines    8 Algos       9 Formulas          │
                            │  10 NN/GNN   11 PRISM AI                        │
                            └────────────┬────────────────────────────────────┘
                                         │
                              ┌──────────┴──────────┐
                              │  rag_rerank surface │   (3 dispatchers:
                              │  (ReRankerEngine)   │    prism_ml = canon
                              └──────────┬──────────┘    prism_ai
                                         │              prism_operating_system)
                                         │
   ┌──────────────────────────────────────┴──────────────────────────────────────┐
   │                                                                             │
   │  ╔══════════════════════════════════════════════════════════════════════╗   │
   │  ║  Hermes closed loop (per session, every Stop)                        ║   │
   │  ║                                                                      ║   │
   │  ║   S1 observe ──▶ S2 cluster ──▶ S3 propose ──▶ S4 dedup ──▶ S5 ship  ║   │
   │  ║      │             │ U-HRP01      │ U-HRP02      │ U-HRP03           ║   │
   │  ║      │             ▼              ▼              ▼                   ║   │
   │  ║      │           wiki+memory    tribal+wiki    skills+wiki+mem       ║   │
   │  ║      │           rerank         rerank         rerank                ║   │
   │  ║      │                                                               ║   │
   │  ║      │           ┌──────────────────────────────┐                    ║   │
   │  ║      │           ▼                              ▼                    ║   │
   │  ║      │   S7 learn ◀── S6 dispatch ◀── operator promote               ║   │
   │  ║      │      │ U-HRP05 (soul)                                         ║   │
   │  ║      │      │ U-HRP06 (mem→wiki)                                     ║   │
   │  ║      │      ▼                                                        ║   │
   │  ║      └──── observation feed-back ◀────────                           ║   │
   │  ║                                                                      ║   │
   │  ║   Decision-policy (per Stop / per /compact):                         ║   │
   │  ║   awarenessLookup ──▶ planSlotAction (U-HRP04: RAG-as-policy)        ║   │
   │  ╚══════════════════════════════════════════════════════════════════════╝   │
   │                                                                             │
   └─────────────────────────────────────────────────────────────────────────────┘
```

**Reading the diagram:** every arrow inside the Hermes loop that today goes "straight" (without consulting the substrate) gets a RAG-rerank step inserted (the labelled U-HRP units). The substrate isn't just *available* to Hermes — every Hermes decision *passes through* it. That's the synergy that turns each closed loop iteration into a compounding-capability instead of an isolated learn-and-publish.

---

## 5. What changes operationally when the matrix fills

| Stage | Before (today) | After (U-HRP01..07 shipped) |
|---|---|---|
| Cluster | Tool-call substring → false clusters across unrelated tasks | Tool-call substring AND semantic-distance against wiki/memory/tribal → cluster only when intent + tools both match |
| Dedup | Jaccard over frontmatter keywords → misses paraphrased duplicates | Jaccard pre-filter PLUS semantic rerank against skill bodies + patterns + feedback memories → paraphrased dup caught |
| Propose | Static stub template | Stub PLUS adjacent tribal exemplars + adjacent wiki entries → operator promotes 5-10× faster |
| Promote | Pure call-count threshold | Threshold AND awareness-fingerprint rerank against historical successful-promotion fingerprints |
| Slot souls | Static | Self-revising via session-correction signal × rerank vs current refuse-rules |
| Memory → wiki | Manual | Stop-hook advisory naming the nearest wiki target |
| Skill body | Operator-authored | First-pass AI-generated from RAG-retrieved exemplars (P3 — only after lower stages prove out) |

**The compounding gain:** every step's quality improves the next step's input. Better clusters → better dedup → better proposals → better-shipped skills → better observed signal next session. None of these compound today because each stage decides in isolation.

---

## 6. Cost model + risk + mitigation

**Cost (in tokens / latency / disk):**

- `rag_rerank` on the 3 surfaces is **already deployed** and benchmarked (~5-20ms per call for ≤100 candidates). Adding a rerank call per Hermes stage adds ≤4 calls per Stop. Net Stop-hook overhead: ~80ms worst case. PRISM Stop hooks routinely run 1-2s — this is below noise.
- Embedding cache: `tribal-embed-index.json` (existing, ~3919 entries) and the wiki vector index (existing) are reused. **No new embedding compute required for U-HRP01-03.**
- **U-HRP07** is the only token-meaningful unit (calling PRISM-AI for body generation, ~500-1500 tokens per draft). That's why it's P3 — defer until lower stages prove the proposal pipeline produces enough drafts to justify the cost.

**Risk:**

1. **Vector staleness when skills are deleted.** Mitigation: tie the skill catalog's embedding refresh to `/dedup` / skill-list rebuild; emit a Stop-hook warning if the embedding index is more than 24h stale and Hermes is about to rerank against it.
2. **Hallucinated "similar matches" at the cluster stage.** Mitigation: AUTO-FAIL the rerank if the top-1 score is below 0.3 (config knob: `PRISM_HERMES_RERANK_FLOOR=0.3`); fall back to the existing tool-call-signature path. R12: never silently degrade — log every fallback in the Hermes JSONL.
3. **Skill body AI-generation cost spike** (U-HRP07 only). Mitigation: per-day budget cap (`PRISM_HERMES_DRAFT_AI_BUDGET=20` skills/day); operator-gated dial.
4. **Soul over-fitting on a noisy session.** Mitigation: a soul-rule candidate needs the same `medianCallCount ≥ 6 ∧ ≥ 2 slots` threshold the skill-loop already uses — a one-off correction in one session is not enough to mutate a soul.

**Operator overrides:** every new rerank call accepts an `--ack-stale` / `--bypass-rag` flag (mirrors the prior `--ack-stale` knob pattern from `feedback_task_freshness_pre_build`). When in doubt, the operator gets the manual escape hatch.

---

## 7. Adoption order + dependency graph

```
P0 wave (parallel, ~2-3 chats / 1 session):
  U-HRP01 (cluster RAG)  ─┐
  U-HRP02 (propose RAG)  ─┼─── all 3 land in skill-loop-pipeline.mjs in one PR;
  U-HRP03 (dedup RAG)    ─┘    tests + dispatcher coverage + 3-of-3 scrutiny.

P1 wave (depends on P0):
  U-HRP04 (RAG-as-policy in zebra orchestrator)
  U-HRP05 (souls evolve from session corrections)

P2 wave:
  U-HRP06 (memory → wiki RAG advisory hook)

P3 wave (depends on P0 + budget approval):
  U-HRP07 (AI-generated skill body drafts)
```

**Estimated effort per unit:** U-HRP01-03 = ~150-200 LOC each in `skill-loop-pipeline.mjs` + ~80-100 LOC of tests = one focused session per unit (or all three in a bravo /loop). U-HRP04 = ~80 LOC in `zebra-orchestrator-sweep.mjs` + the lib. U-HRP05-06 = new hooks, ~200 LOC each. U-HRP07 = ~150 LOC + budget guard.

---

## 8. What's out of scope (decided here so it doesn't drift into another spec)

- **Multi-language embedding** — current `rag_rerank` is English-only; not a blocker for PRISM (English-only doctrine).
- **Vector store migration** — the existing tribal-embed-index + wiki vector index are JSON-backed; sufficient for ≤10K entries. Migration to a real vector DB (qdrant, etc.) is RAG-UPGRADE-MS1 territory.
- **Cross-session reranker training** — making the reranker learn from operator promote/reject choices is a tier-2 RL loop, out of scope here (links to RGS / NN-GRAPH territory).
- **Inline RAG at observation time** (S1) — observation is "fire and forget" by design; adding RAG to S1 would slow every Stop hook. Keep S1 minimal; do the RAG work at S2-S7 when the operator has already paid the Stop cost.

---

## 9. Validation gates before any U-HRP unit ships

Every U-HRP unit must satisfy:

1. **Variability floor (≥3 spanning configurations)** — for cluster/dedup/propose, that means ≥3 distinct domains (mill / lathe / wedm). For soul evolution, that's ≥3 slots. Comprehensive-build-enforce already requires this.
2. **R12 fail-loud** — every RAG call has a fallback path; every fallback is logged in `state/shared/zebra-orchestrator-log.jsonl` (or the Hermes equivalent) with `gateReason: "rag-{below-floor,index-stale,call-failed}"`.
3. **PSN-leg attribution** — every RAG rerank logs WHICH leg it queried (corpus name), so the `prism_session:psn_attribution` action (planned) can audit which PSN legs Hermes actually consulted per session.
4. **3-of-3 scrutiny gate** — per CLAUDE.md, every multi-file commit goes through Agent A + Agent B + Codex/code-analyzer.
5. **Doc reflection** — every U-HRP that ships updates CLAUDE.md pointer + MEMORY.md pointer + wiki entry + Obsidian memory (per `feedback_reflect_all_changes_post_update`).

---

## 10. Memory + wiki output for this spec (auto-feed targets)

- **Obsidian memory:** `reference_hermes_psn_rag_synergy_research_2026_05_23.md` — captures the matrix + adoption order.
- **Wiki entry:** `knowledge/wiki/architecture/hermes-psn-rag-synergy.md` — operator-facing summary + matrix table + diagram (regenerated by `generate-misc-l8-wiki.mjs`).
- **CLAUDE.md pointer:** `## RAG-PSN-HERMES-MS0` section once any U-HRP unit ships; for now stays in this spec only.
- **System-viz roost:** spec auto-renders as L8 ghost via `generate-misc-l8-wiki.mjs` next regen; root node `ghost.spec.hermes-psn-rag-synergy-research-2026-05-23`.

---

## 11. One-line summary for the next bravo session

> RAG-UPGRADE-MS0 wired RAG vertically (every PSN-leg dispatcher can call rerank). HERMES-MS0+MS1 wired Hermes vertically (closed loop observation → ship). The horizontal wiring — Hermes' four decision stages each consulting RAG against the 11 PSN legs — is the next compounding lever. 7 candidate units (U-HRP01..07); P0 wave is 3 units in `skill-loop-pipeline.mjs`; ship those before P1.

---

## 12. See also

- [HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md](HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md) — original gap research
- [HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md](HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md) — Obsidian-as-OS framing
- [HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20.md](HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20.md) — 9-pattern adoption matrix
- [ZEBRA-HERMES-GAP-AUDIT-2026-05-20.md](ZEBRA-HERMES-GAP-AUDIT-2026-05-20.md) — G5/G6/G13 leaks that this spec finishes closing
- [RAG-UPGRADE-MS0.md](RAG-UPGRADE-MS0.md) — RAG vertical wiring (5 units shipped + 2 PSN-leg cross-wires)
- [`reference_u_rag_psn_ai_wire_2026_05_22.md`](../../knowledge/memories/reference/reference_u_rag_psn_ai_wire_2026_05_22.md) — 11th PSN leg RAG wire
- [`reference_u_rag_psn_os_wire_2026_05_23.md`](../../knowledge/memories/reference/reference_u_rag_psn_os_wire_2026_05_23.md) — 2nd PSN leg RAG wire (this morning, golf)
- [`feedback_psn_definition.md`](../../knowledge/memories/feedback/feedback_psn_definition.md) — canonical 11-leg PSN
- [`hermes-zebra-integration.md`](../../knowledge/wiki/architecture/hermes-zebra-integration.md) — architecture diagram
- `scripts/lib/skill-loop-pipeline.mjs` — the file U-HRP01-03 edit
- `scripts/lib/chat-orchestrator-decisions.mjs` — the file U-HRP04 edits

---

*End of deep-research deliverable. Operator-reviewable; nothing in here is shipped. The matrix is the deliverable — pick units to enqueue against the slot queue when ready.*
