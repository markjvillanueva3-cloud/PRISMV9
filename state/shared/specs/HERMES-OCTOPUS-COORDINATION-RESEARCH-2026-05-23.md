# HERMES coordinating OCTOPUS — research deliverable (companion to HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23)

**Date:** 2026-05-23 · **Slot:** bravo (`claude-ea80ce2f`) · **Status:** plan (operator-reviewable, nothing shipped)
**Companion to:** [HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23.md](HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23.md) (P0 wave U-HRP01+02+03 shipped 2026-05-23, commit `a8c86fe6d8`).

Operator directive (post P0 ship): *"do further research on how we can improve hermes + synergies with PSN + having it coordinate octopus"*. This extension takes the matrix-driven framework from the prior spec and projects it onto the **octopus 5-voice consensus mechanism** + the **next-frontier Hermes improvements** beyond the original 7 U-HRP units.

---

## 0. What "octopus" is today (1-line orientation)

The PRISM **octopus** is the 5-voice consensus pipeline (`scripts/octopus-setup.mjs` + related). Five reasoning arms (variants of Claude/Ollama instances with distinct prompts) are dispatched in parallel on contested questions; their outputs are merged via majority-rule + dissent-surface. It's the project's *bring-the-five-experts-into-the-room* mechanism, hooked into certain UserPromptSubmit / PreToolUse triggers for high-stakes decisions.

Per `feedback_psn_definition.md` line 49: *"Octopus consensus ← PRISM AI + System Viz (currently); SHOULD also pull from Wiki + Memories + Tribal (enhancement target)"*. Octopus today consults **2 of 11 PSN legs**. Hermes coordinating octopus = wiring Hermes (with its RAG + PSN-substrate access) as the **upstream curator** that decides *when* octopus runs, *what context* octopus sees, and *how* octopus's verdict integrates back into the learning loop.

---

## 1. The thesis

**Hermes is the right layer to coordinate octopus because Hermes is the only PRISM subsystem that already has the closed-loop shape (observe → cluster → propose → dedup → promote → dispatch → learn) octopus needs to become *trained* instead of just *invoked*.** Today octopus is a hard-coded pre-tool gate or hook trigger; every invocation is independent of every prior invocation. Hermes brings the missing learning loop: prior consensus outcomes become RAG-indexed training signal, and the policy of *when to even invoke octopus* gets learned from past success/failure rather than hand-tuned.

---

## 2. Four octopus-coordination units (U-HOC01..04)

Each unit is one specific Hermes-coordinates-octopus surface. Like the U-HRP series, they're dependency-ordered and operator-gateable.

### U-HOC01 — Octopus-input curator (P0 for octopus side)

**Problem today:** when octopus fires, the prompts going to each of the 5 voices are templated from the UserPromptSubmit content alone. The voices don't see the PSN substrate (wiki, memories, tribal) unless those tokens happen to be in the user's prompt verbatim. Result: 5 voices reasoning about the same surface-level prompt without the depth PRISM already has on disk.

**Fix:** before octopus dispatches the 5 voices, run RAG-rerank against the PSN substrate (wiki + memories + tribal + skills) for the prompt's intent. Inject the top-3 per leg into the **shared context block** that every voice receives. The 5 voices then disagree (or agree) over *the same enriched substrate*, not over their respective guesses about what's relevant.

**Surface:** new `scripts/lib/octopus-input-curator.mjs` lib that wraps the octopus dispatch step. Pure-core (`opts.rerank` injection). Mirrors the HRP02 `renderPsnExemplars` shape; share the helper.

**Effort:** ~120 LOC + tests. Reuses the existing rerank infrastructure shipped in P0.

**Test floor:** ≥3 spanning prompt domains (physics question / dispatcher-wiring question / Hermes-skill question) × verify each voice sees the relevant leg's exemplars in its system prompt.

### U-HOC02 — Octopus-output → Hermes learning signal (P0 closing the loop)

**Problem today:** when octopus produces a consensus + dissent, that decision is logged but **not used to teach future octopus calls**. Two identical-intent prompts a week apart will rerun the full 5-voice fan-out from scratch.

**Fix:** every octopus run writes a structured `octopus-run-N.jsonl` entry to a Hermes-observable ledger (mirrors `skill-candidates.jsonl`). The entry contains: prompt, top-3 PSN exemplars injected, each voice's verdict, the merged consensus, dissent items, and (eventually) operator feedback on whether the consensus was right. Hermes' cluster→promote pipeline operates on these entries — a recurring consensus pattern becomes a **codified policy** ("for prompts matching X intent class, the answer is Y; skip octopus, route directly").

**Surface:** new `.claude/hooks/post-octopus-record.mjs` (PostToolUse-equivalent — fires after octopus completes) + new ledger file + extension to `scripts/lib/skill-loop-pipeline.mjs` to recognise octopus-shaped clusters (`kind: "octopus-consensus"`).

**Effort:** ~200 LOC + tests + ledger schema.

**Test floor:** ≥3 spanning consensus outcomes (unanimous / split / dissent-with-tiebreaker) × verify each surfaces correctly in the ledger for clustering.

### U-HOC03 — Octopus invocation policy: when to fire (P1)

**Problem today:** octopus is invoked by hard-coded matcher rules (certain hooks, certain keyword regexes). High-stakes prompts may not match the matchers; low-stakes prompts may trigger unnecessary fan-out. Per `feedback_psn_definition.md`: *"aiSystemRouterEngine (leg #11) should be the upstream router that decides whether to even invoke octopus"*.

**Fix:** route the octopus-invoke decision through `aiSystemRouterEngine.route()`. Given a prompt + PSN context, the router returns one of: `route:single-claude`, `route:octopus`, `route:ollama-only`, `route:skip-ai`. The decision is informed by U-HOC02's learning signal: prompts semantically similar to past octopus-success cases default to `octopus`; prompts similar to past octopus-overkill cases default to `single-claude`.

**Surface:** extend `aiSystemRouterEngine` with an `octopus-route` action. Add an `octopus_decider` field to ledger entries so future training has the policy choice + outcome. Pure routing logic; reuses the RAG infrastructure.

**Effort:** ~150 LOC + tests + dispatcher wiring.

**Test floor:** ≥3 spanning routing classes; round-trip through `prism_ai` dispatcher.

### U-HOC04 — Octopus voice diversity tuning from learning signal (P2)

**Problem today:** the 5 voices are fixed personas (defined in `scripts/octopus-setup.mjs`). If 4 voices agree but 1 dissents consistently across 50 sessions, the dissenting voice is either uniquely valuable or systematically wrong. Today there's no closed feedback to tune the persona list.

**Fix:** Hermes' clustering operates on per-voice patterns from the U-HOC02 ledger. A voice with a high false-positive rate (consensus correct but voice dissented) gets a **negative weight** in future merges; a voice with a unique-correct rate (voice correct AND alone) gets a **positive weight**. Personas can be retired or new personas proposed via the standard `shipDraft` pipeline → operator-gated promote.

**Surface:** new `scripts/lib/octopus-voice-tuner.mjs` lib reading the U-HOC02 ledger + emitting persona-weight proposals. NEVER auto-mutates `octopus-setup.mjs`; emits to `state/shared/specs/OCTOPUS-VOICE-TUNING-<id>.md` for operator review.

**Effort:** ~150 LOC + tests + per-voice statistics.

**Test floor:** synthetic ledger with ≥3 voice-behaviour patterns (always-with-consensus / always-dissent / uniquely-correct) × verify correct weight proposals.

---

## 3. The deeper Hermes improvements — five next-frontier units (U-HFR01..05)

Beyond P0/P1/P2/P3 of the original U-HRP series, these are the **structural** improvements to Hermes that no shipped roadmap covers yet. They build on the U-HOC ledger + the P0 wave RAG infrastructure.

### U-HFR01 — Closed-loop cluster *quality* feedback (P1)

Today `gateCandidate` promotes a cluster based on `medianCallCount + slots` heuristics. There's no measurement of whether the **shipped skill was actually used productively**. Fix: when a Hermes-shipped skill (from `state/shared/specs/SKILL-CANDIDATE-AUTOPASS-<id>.md` → operator-promoted to `.claude/commands/<name>.md`) is invoked, record an outcome signal (success/failure/abandoned) into the same ledger. After N outcomes, re-evaluate the original cluster's gate decision; if the shipped skill is consistently abandoned, mark the cluster as "noise-pattern" so future similar clusters auto-FAIL.

### U-HFR02 — Cross-slot skill propagation (P2)

A skill that bravo invents (e.g. a mill-specific physics-validate helper) may benefit charlie (wire-EDM specialist) IF the underlying tool-call shape transcends domain. Today every slot's clusters are siloed by `slots` field. Fix: introduce a `cross-slot-similarity` metric — when a cluster's signature is ≥X% similar to a recently-shipped cluster in another slot, surface it for the inventing slot's operator AS "your peer also built this; want to consolidate?". RAG-driven; reuses U-HRP02 exemplar infrastructure.

### U-HFR03 — Tribal-distillation auto-loop (P2)

Today PRISM has 3,919 tribal tips + a wiki of 28K entries — but no auto-pipeline that converts an observed-and-learned Hermes pattern back into a tribal entry. Fix: when a Hermes cluster ships AND U-HFR01 outcome signal shows ≥3 successful uses, propose a tribal-knowledge entry (`knowledge/wiki/code-tribal/learnings/<topic>.md`) with the cluster's signature + observed contexts. Operator-gated. This *back-flows* learned operational knowledge into the searchable substrate — closing the loop from "PRISM learns" → "PRISM teaches future sessions".

### U-HFR04 — Soul-correction → Hermes-skill graduation (P3)

Today slot souls (per HRP05 in the prior spec) can grow `refuse_list` entries from corrections. Some refuse-rules are universal enough to deserve promotion to **all slots** (e.g. "never inline Kienzle constants" started as a bravo refuse but applies fleet-wide). Fix: when a refuse-rule appears in N≥3 slot souls (after they've all evolved it independently from observed correction signal), surface it as a candidate for CLAUDE.md promotion. Mirrors the memory-promotion path: fleeting → per-slot → fleet-wide → doctrine.

### U-HFR05 — RAG-index health + auto-refresh (infra) (P0 if shipped with HRP04+)

The HRP series depends on tribal-embed-index + wiki vector index being fresh. Today there's no Stop-hook that detects "this index is older than the underlying file mtime and Hermes RAG calls will use stale embeddings". Fix: a `stop-rag-index-staleness-check.mjs` Stop hook compares each index's mtime to the corpus mtime; emits an advisory when stale > 24h; never auto-refreshes (regen is operator-gated due to embedding cost). All Hermes/RAG-using stages then surface "WARNING: RAG running against stale index" in their JSONL logs (R12 fail-loud).

---

## 4. Updated 3D matrix — what P0 closed

Versus the prior spec's 7×11 matrix, P0 wave (U-HRP01+02+03) just closed:

| Stage | Leg closed | How |
|---|---|---|
| S2 cluster | 3 wiki, 4 mem, 5 tribal | Sub-cluster path in `clusterCandidates`; backwards-compatible. |
| S3 propose | 3 wiki, 5 tribal | `renderPsnExemplars` block in `buildStubBody`. |
| S4 dedup | 3 wiki, 4 mem | Semantic rerank path in `gateCandidate` (legacy paths preserved). |

The 4 decision stages × 11 legs matrix went from **0 cells filled** to **9 cells filled** (3 stages × 3 legs each). The remaining 35 unfilled cells in the decision-stage rows are addressed by U-HRP04..07 (P1-P3 of the prior spec) + U-HOC01..04 (octopus surfaces) + U-HFR01..05 (deeper).

---

## 5. Full unit inventory (P0 shipped + everything pending)

| Unit | Source spec | Wave | Status |
|---|---|---|---|
| U-HRP01 | HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23 | P0 | ✅ shipped 2026-05-23 (a8c86fe6d8) |
| U-HRP02 | same | P0 | ✅ shipped 2026-05-23 |
| U-HRP03 | same | P0 | ✅ shipped 2026-05-23 |
| U-HRP04 | same | P1 | 🔵 pending — RAG-as-policy in zebra orchestrator |
| U-HRP05 | same | P1 | 🔵 pending — souls evolve from session corrections |
| U-HRP06 | same | P2 | 🔵 pending — memory→wiki promotion advisory |
| U-HRP07 | same | P3 | 🔵 pending — AI-generated draft bodies |
| U-HOC01 | THIS SPEC | P0 (octopus) | 🔵 pending — octopus-input curator |
| U-HOC02 | THIS SPEC | P0 (octopus) | 🔵 pending — octopus-output → Hermes ledger |
| U-HOC03 | THIS SPEC | P1 (octopus) | 🔵 pending — invocation policy via aiSystemRouter |
| U-HOC04 | THIS SPEC | P2 (octopus) | 🔵 pending — voice diversity tuning |
| U-HFR01 | THIS SPEC | P1 (deeper) | 🔵 pending — outcome-quality feedback |
| U-HFR02 | THIS SPEC | P2 (deeper) | 🔵 pending — cross-slot skill propagation |
| U-HFR03 | THIS SPEC | P2 (deeper) | 🔵 pending — tribal-distillation auto-loop |
| U-HFR04 | THIS SPEC | P3 (deeper) | 🔵 pending — soul-rule fleet-wide graduation |
| U-HFR05 | THIS SPEC | P0 (infra) | 🔵 pending — RAG index staleness Stop hook |

**Total open work:** 13 units across 4 priority bands. P0 (next session): U-HOC01 + U-HOC02 + U-HFR05 = 3 units. P1: 4 units. P2: 3 units. P3: 2 units (+1 already-P3 U-HRP07).

---

## 6. Adoption order with octopus added

```
P0 wave (already partially shipped):
  ✅ U-HRP01+02+03  — semantic cluster + PSN exemplars + semantic dedup (a8c86fe6d8)
  🔵 U-HOC01        — octopus-input curator (one bravo /loop session)
  🔵 U-HOC02        — octopus-output → ledger (one bravo /loop session)
  🔵 U-HFR05        — RAG-index staleness Stop hook (infra; one session)

P1 wave (depends on P0):
  🔵 U-HRP04        — RAG-as-policy in zebra (depends on HRP P0)
  🔵 U-HRP05        — souls evolve (depends on HRP P0)
  🔵 U-HOC03        — octopus invocation policy (depends on HOC P0)
  🔵 U-HFR01        — outcome-quality feedback (depends on HRP+HOC P0)

P2 wave:
  🔵 U-HRP06        — memory→wiki advisory
  🔵 U-HOC04        — octopus voice diversity tuning
  🔵 U-HFR02        — cross-slot skill propagation
  🔵 U-HFR03        — tribal-distillation auto-loop

P3 wave (budget-gated):
  🔵 U-HRP07        — AI-generated draft bodies
  🔵 U-HFR04        — soul-rule fleet-wide graduation
```

---

## 7. Risk register (delta vs prior spec)

Net-new risks introduced by octopus coordination:

1. **Octopus latency under enriched context** — U-HOC01 adds RAG calls (~80ms) BEFORE the 5-voice fan-out. Octopus fan-out already takes 5-30s; the extra 80ms is noise. Mitigation: not a concern.
2. **Octopus ledger growth** — U-HOC02 adds ~1-5 KB per octopus run. At current octopus invocation rate (~10-50/day fleet-wide), this is 50-250 KB/day = 18-91 MB/year. Mitigation: rotate the ledger monthly + compress old entries; trivial.
3. **U-HOC03 policy-drift risk** — if the router learns to skip octopus for too many prompts, the consensus mechanism atrophies and is undertrained. Mitigation: budget knob `PRISM_OCTOPUS_MIN_INVOKE_RATE=0.1` — guarantees at least 10% of eligible prompts still hit octopus, even if the router predicts not-needed. Forces continuous training signal.
4. **U-HOC04 voice-pruning risk** — pruning a dissenting voice that's actually right erodes diversity. Mitigation: voice weights propose only; never auto-apply. Operator-gated promote.

The other risks (vector staleness, hallucinated similar-matches, AI-gen cost, soul over-fitting) are inherited from the prior spec; mitigations unchanged.

---

## 8. What's still out of scope

- **Multi-octopus federation** (running multiple octopus instances with different voice sets in parallel) — not justified at fleet scale today.
- **Octopus as a service externalisable beyond PRISM** — keep this internal; consensus mechanisms tuned to PRISM doctrine don't transfer.
- **Real-time octopus** (sub-second latency by parallel pre-warming) — orthogonal to coordination; covered in a future octopus-perf spec if needed.
- **Soul as voice** in octopus (each NATO slot's soul becomes one of the 5 voices) — interesting but architecturally separate; deserves its own spec because it changes octopus from "5 abstract personas" to "fleet of 5 slot-personalities".

---

## 9. What this spec asks the operator to do

Nothing immediate. Spec is operator-reviewable. When ready to ship more:

1. Pick from the P0 wave (the 3 pending: U-HOC01, U-HOC02, U-HFR05).
2. One unit = one bravo /loop session typically; or send all 3 to different slots simultaneously (no overlapping files).
3. P0 wave done → P1 unblocks (U-HRP04+05, U-HOC03, U-HFR01).

The full 13-unit inventory is documented above so any slot can pick up any unit with clear dependency context.

---

## 10. See also

- [HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23.md](HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23.md) — prior spec (7×11 matrix + 7 U-HRP units; P0 wave shipped)
- [HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md](HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md) — Obsidian-as-OS framing
- [HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20.md](HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20.md) — 9-pattern matrix
- `scripts/octopus-setup.mjs` — current octopus 5-voice implementation
- `scripts/lib/skill-loop-pipeline.mjs` — where U-HRP01+02+03 ship; where U-HOC02 / U-HFR01 extend
- `aiSystemRouterEngine` — where U-HOC03 lands
- `feedback_psn_definition.md` — names octopus's PSN gap

---

*Spec written 2026-05-23 by claude-ea80ce2f slot bravo, post-P0 ship. Operator-reviewable; nothing in §2 / §3 is shipped yet.*
