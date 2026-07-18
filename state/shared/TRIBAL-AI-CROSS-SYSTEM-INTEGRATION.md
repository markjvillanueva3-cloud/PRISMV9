# TRIBAL × AI × Cross-System Integration

**Date:** 2026-05-09
**Author:** Claude (claude-99eca613)
**Companion to:** `TRIBAL-AI-ARCHITECTURE.md`, `TRIBAL-KNOWLEDGE-LEVERAGE-PLAN.md`

> User: "Can we combine it with other existing systems to further enhance its utilization — deep learning, deep reasoning, neural network, prism awareness, prism ai, domain ai systems, and obsidian?"

**Verdict:** yes, and **most bindings already exist on disk** — the work is mostly wiring, not building. Per recent commits (`8cb790abe OBSIDIAN-COMPOUND-MS1` shipped auto-postmortem + weekly tribal promotion; `031175ddc OBSIDIAN-CONTENT-MS2` shipped cyrilXBT JARVIS; `XPROC-NEURAL-OPTIMIZE-MS0` is shipping conformal NN), the neighbor systems already produce/consume tribal-shaped data. We just need a unified bus.

---

## Unified data-flow diagram

```
                   ┌──────────────────────────────────────────────────┐
                   │  OBSIDIAN VAULT (authoring + capture surface)    │
                   │  · daily-brief auto-materializes connections     │
                   │  · cyrilXBT JARVIS 5-pillar content stack         │
                   │  · inbox capture-sharpen PostToolUse hook        │
                   └──────────────────────────────────────────────────┘
                           ▲ (sync, both ways — auto-postmortem)
                           ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │           TRIBAL CORPUS (1,200 entries, 4 formats)                │
   │  wiki/  ·  memories/  ·  extraction-log  ·  engine-internals      │
   │                                                                    │
   │  ┌──────────────────────────────────────────────────────────┐    │
   │  │  L1 UNIFIED EMBED INDEX  ←───  re-embed on every change   │    │
   │  └──────────────────────────────────────────────────────────┘    │
   └──────────────────────────────────────────────────────────────────┘
       │           ▲           │           ▲          │            ▲
       │ feeds     │ outcomes  │ feeds     │ outcomes │ feeds     │ outcomes
       ▼           │           ▼           │          ▼            │
   ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌────────┐
   │ DEEP    │ │ NEURAL   │ │ PRISM    │ │ DOMAIN │ │ PRISM AI │ │ FULL-  │
   │ REASON  │ │ NETS     │ │ AWARE    │ │ AIs ×7 │ │ ROUTER   │ │ SYSTEM │
   │ (L3)    │ │ (conform.)│ │          │ │ (LoRAs)│ │          │ │ COORD  │
   │         │ │          │ │          │ │        │ │          │ │        │
   │ explores│ │ predicts │ │ recommen-│ │ domain-│ │ routes   │ │ Tier-2 │
   │ cross-  │ │ outcomes │ │ ds AI    │ │ specifc│ │ tasks    │ │ orches │
   │ domain  │ │ from past│ │ features │ │ rerank │ │ to right │ │ trator │
   │ synth   │ │ tribal   │ │ + tribal │ │ + LoRA │ │ system   │ │        │
   └─────────┘ └──────────┘ └──────────┘ └────────┘ └──────────┘ └────────┘
       │           │           │           │          │            │
       └───────────┴───────────┴───────────┴──────────┴────────────┘
                                   │
                                   ▼
                       ┌────────────────────────┐
                       │  ACTIVE TASK / EDIT    │
                       │  · receives top-3 tips │
                       │  · receives synthesis  │
                       │  · receives prediction │
                       │  · receives recom.     │
                       │  · all citation-tracked│
                       └────────────────────────┘
                                   │
                                   ▼
                          (commit / outcome)
                                   │
                                   ▼
                       feeds back to embed index
                       feeds back to Obsidian vault
                       feeds back to neural calibration
                       feeds back to LoRA training set
```

The corpus is the **single shared substrate** — every named system either contributes to it or consumes from it. No system is bypassed; none re-derives.

---

## System-by-system binding (full enumeration)

### 1. Deep Reasoning — `PRISMCreativeReasoningEngine`

**Already wired:** L3 of the tribal-AI architecture (synthesis from top-3 candidates).

**Cross-system enhancement:**
- Feed `tribal-citation-log.jsonl` into `explore()` as a *prior*. Today the engine does first-principles cross-domain synthesis; with the citation prior it favors solutions that have worked before in similar contexts.
- Inverse: when `explore()` produces a novel solution, distill it as a candidate tribal entry (gated on novelty cosine ≥ 0.15 and outcome-positive feedback within 5 milestones).

**Net new code:** 1 wrapper (`tribal-reasoning-bridge.mjs`, ~80 LOC). Engine API unchanged.

---

### 2. Deep Learning / Neural Networks — `CrossDisciplinaryDeepLearningEngine` + `XPROC-NEURAL-OPTIMIZE-MS0` neural stack

**Already wired:** `CrossDisciplinaryDeepLearningEngine` is L2 reranker. `AdaptiveConformalAlphaEngine` just shipped (per commit `03586e2fa`).

**Cross-system enhancement:**
- **Reranker → meta-learner:** train `CrossDisciplinaryDeepLearningEngine` on `tribal-citation-log` so it learns *which entries actually fire for which task types*. After ~500 citation events the reranker becomes a learned model, not a heuristic.
- **Conformal prediction calibration:** tribal entries with operator-validated outcomes (Mill production data, JM Die programs) are perfect calibration samples for `AdaptiveConformalAlphaEngine`. Each entry's `predicted_*` field becomes a calibration point; observed outcome closes the loop. This converts tribal corpus from "advice" → "ground-truth dataset for prediction intervals."
- **Catastrophic-forgetting guard:** the conformal stack already has EWC++ regularization wired (per project memory). Tribal-driven training reuses that.

**Net new code:** `tribal-conformal-bridge.mjs` (calibration sample extractor, ~120 LOC). No engine modifications.

---

### 3. PRISM Awareness — `prismSelfAwarenessEngine`

**Already wired:** Has `searchTribalKnowledge()`, `searchPlaybookRules()`, `recommendAIFeatures()`, `getJMDieCustomerPath()`. Per `[[tribal_auto_categorization]]` memory, auto-categorization is built in.

**Cross-system enhancement:**
- **Bind tribal precheck to `recommendAIFeatures()`:** when self-awareness recommends a multi-agent strategy, also surface the top-3 tribal entries that informed prior runs of similar strategies. Output expands from "use these agents" → "use these agents AND here are the 3 lessons from last time".
- **Index JM Die corpus into the unified embed store:** `getJMDieCustomerPath()` becomes a vector query, not a string match. Customer-specific tribal (ITW thin-wall lessons, Alcoa surface-finish history) becomes searchable by semantic similarity, not exact name.

**Net new code:** modify `prismSelfAwarenessEngine.searchTribalKnowledge()` to call into the unified embed index instead of the existing fuzzy match. ~30 LOC change. **NOT in our lane** — `claude-cee63f1f` is editing dispatchers; coordinate via AGENT_CHAT.md before touching engine source.

---

### 4. PRISM AI Router — `aiSystemRouterEngine`

**Already wired:** Routes tasks to right system per CLAUDE.md (Claude for reasoning, Ollama for code, dispatchers for physics).

**Cross-system enhancement:**
- **Tribal-density routing hint:** before routing, query tribal corpus density for the task domain. If ≥20 cited entries, prefer the cheap path (Ollama retrieval + tribal inject). If <5 entries, escalate to deep-reasoning (Claude + `PRISMCreativeReasoningEngine`) — first-principles is cheaper than retrieving from a sparse corpus.
- **Cost feedback loop:** route decisions log to `tribal-citation-log`. When the cheap path fires and the outcome is positive, raise the threshold for escalation; when it misses, lower it. Self-tuning.

**Net new code:** `tribal-density-router-bridge.mjs` wrapper around `aiSystemRouterEngine.route()`, ~60 LOC.

---

### 5. Domain-Specialist AIs (7 total — Mill / Lathe / WEDM / Sinker / Welder / Grinder / CAD)

**Already wired:** Per CLAUDE.md, each has `*-harden`, `*-learn`, `*-optimize`, `*-validate` skills. Lathe-LoRA already exists. Per WEDM_DIGEST.json: 62 WEDM engines, 23 skills, 46 tribal tips.

**Cross-system enhancement:**
- **Per-domain reranker bias:** L2 reranker takes a `domain` parameter. Mill-domain queries weight mill-tagged tribal entries 2× and de-rank lathe-only entries (unless cross-domain tag set).
- **Per-domain LoRA training data:** quarterly LoRA refresh per domain trains on the citation-positive subset of in-domain tribal entries. Lathe-LoRA already does this manually; this just turns it into a cron with the same training set as the reranker.
- **Cross-domain bridges (auto-tag):** `tribal-bridge.mjs` (L7 in earlier plan) auto-suggests cross-domain tags so a chatter-on-thin-wall mill tip surfaces during a lathe boring query. Already in the plan; just confirming it fits.

**Net new code:** domain-aware param passed through L2 reranker (~10 LOC change). LoRA refresh cron skill (~150 LOC, deferred per architecture doc).

---

### 6. FullSystemAICoordinator (Tier-2 orchestrator)

**Already wired:** Sits between Claude and the 7 domain AIs (per CLAUDE-BRIEF identity).

**Cross-system enhancement:**
- **Pre-context injection:** when the coordinator dispatches a task to a domain specialist, attach the top-3 tribal entries for that domain as a precontext block. Specialists stop re-deriving knowledge; they start each call with the relevant 200 tokens of corpus context already injected.
- **Outcome aggregation:** when all domain specialists complete a task, the coordinator emits a single outcome event into `tribal-citation-log` covering the whole orchestration. Tier-2 outcomes carry more signal than per-call outcomes.

**Net new code:** `tribal-tier2-precontext.mjs` middleware that wraps coordinator dispatch calls, ~100 LOC. Engine source untouched.

---

### 7. Obsidian — already a bidirectional partner

**Already wired (per recent commits):**
- `8cb790abe OBSIDIAN-COMPOUND-MS1/U-MEMORIES-MISTAKES-WIRE` — auto-postmortem engine
- `8cb790abe OBSIDIAN-COMPOUND-MS1/U-TRIBAL-CONSOLIDATE` — weekly tribal promotion
- `031175ddc OBSIDIAN-CONTENT-MS2` — cyrilXBT JARVIS 5-pillar content stack
- `d2ffc9a7b OBSIDIAN-CONTENT-MS2/U-MS1-MS2-INTEGRATION` — daily-brief auto-materializes connections
- `afa62600e OBSIDIAN-AUTOMATE-MS3` — inbox capture-sharpen PostToolUse hook + 48h inbox prune cron

**Cross-system enhancement:**
The Obsidian half of the loop is already richer than the wiki half. The work is making them mutually-aware, not building either side:
- **Outbound (tribal → Obsidian):** every wiki/lesson auto-creates a stub Obsidian note with `[[wiki:entry-name]]` links, materialized by the daily-brief engine. Human-authored Obsidian elaboration syncs back via the auto-postmortem engine.
- **Inbound (Obsidian → tribal):** inbox-capture hook already runs on PostToolUse. Add a single rule: if a captured note has shop-floor signal (operator quote, machine alarm, surface-finish observation), route through the same novelty-gate as L5 distill. Captures graduate to tribal via the existing weekly tribal-promotion cron.
- **Index Obsidian vault into the unified embed store** (alongside wiki/memories/extraction-log). Obsidian's daily-brief connections become first-class tribal nodes with `source: obsidian` tag.

**Net new code:** `tribal-obsidian-mirror.mjs` cron, ~80 LOC. Reuses existing Obsidian infrastructure entirely.

---

## Closed-loop properties (why this compounds)

After all 7 bindings are wired, every event in the system contributes to every system:

```
edit happens
   → tribal-inject-on-edit fires (L4, retrieves)
   → operator runs/validates
   → outcome lands in citation log
       → reranker meta-learner updates (deep learning)
       → conformal model recalibrates (neural)
       → router cost-tracking updates (PRISM AI)
       → domain LoRA training set grows (domain AIs)
       → Obsidian daily-brief reflects change (tribal × obsidian)
       → self-awareness recommendation table refreshes (PRISM awareness)
       → if novel: auto-distill emits new tribal entry (deep reasoning gate)
            → embed → indexed → next edit benefits
```

**Six independent feedback loops, one corpus.** The compounding rate is the product of the loop gains, not the sum.

---

## Failure-mode coverage (cross-system specific)

| Failure | Mitigation |
|---------|-----------|
| **Loop hazard** (A feeds B feeds A → oscillation) | Each cross-system feed is asynchronous + idempotent. Citation log is the only shared write target; all reads are pull-based. No cycles within a single transaction. |
| **Hallucination amplification** (LLM-on-LLM-on-LLM) | Each layer must cite the corpus entry id it derived from. Deep reasoning (L3) cannot synthesize without ≥1 citation; conformal (NN) cannot calibrate without ≥1 outcome event. Synthesis-of-synthesis blocked structurally. |
| **Catastrophic forgetting** (continual LoRA fine-tune) | EWC++ already wired in the conformal stack; reuse the same penalty for per-domain LoRA training. Quarterly refresh, not continuous. |
| **Authority confusion** (deep-reasoning answer disagrees with tribal) | Tribal corpus is authoritative for *operator-validated* outcomes; deep reasoning is authoritative for *first-principles* novel cases. Conflict resolver: cite both, surface the tier (validated > derived) in the inject. |
| **Domain bleed** (lathe LoRA trains on mill tips) | L2 reranker `domain` param is hard, not soft. LoRA training set is filtered by `source.domain` tag. Cross-domain bridges are explicit tags, not implicit retrieval. |
| **Obsidian capture flood** (every random note becomes tribal) | Same novelty gate (cosine ≥ 0.15) + a "shop-floor signal" classifier. Captures without operator/machine/measurement keywords stay in inbox; only signal-bearing captures graduate. |

---

## Build order (refines `TRIBAL-AI-ARCHITECTURE.md` Day-1 plan)

**Same Day-1 effort (~3 hours), additional bindings ride free because the cross-system bridges all consume the same embed index:**

```
hour 1   L1 tribal-embed-index.mjs (bootstrap on 1,200 entries)
              + immediately register Obsidian vault as a 5th source corpus

hour 2   L2 tribal-rerank.mjs (domain-aware, citation-log-aware)
              + tribal-density-router-bridge.mjs (PRISM AI router hint)

hour 3   L4 tribal-inject-on-edit.mjs (PreToolUse hook)
              + tribal-tier2-precontext.mjs (FullSystemAICoordinator middleware)
              + L6 tribal-autowire.mjs (auto-embed on any corpus write)
              + tribal-obsidian-mirror.mjs (cron — wires the Obsidian half)
              + settings.json wiring (PreToolUse + PostToolUse + cron)
```

**Deferred to next session (require citation log to have signal):**
- `tribal-reasoning-bridge.mjs` (deep-reasoning prior — needs ≥100 citations to be useful)
- `tribal-conformal-bridge.mjs` (NN calibration — needs ≥50 outcome events)
- Per-domain LoRA refresh cron (needs ≥1 quarter of citation data)
- Modifying `prismSelfAwarenessEngine.searchTribalKnowledge()` directly (peer-claim-aware, coordinate first)

---

## What this gives Mark

After day-1 ships:

1. **Every edit** to engines/dispatchers/algorithms/skills/hooks gets the top-3 most-relevant tribal entries injected — drawn from wiki + memories + extraction-log + WEDM tips + JM Die corpus + Obsidian vault, ranked by `CrossDisciplinaryDeepLearningEngine`.
2. **Every commit** triggers auto-distill (peer chat's `distill-tribal.mjs`), feeding new entries back into the same index — the next edit benefits without human action.
3. **Every Tier-2 orchestration** to the 7 domain AIs starts with a tribal precontext block, so specialists stop re-deriving.
4. **Every routing decision** by `aiSystemRouterEngine` is informed by tribal-corpus density — sparse domains escalate to deep reasoning, dense domains use cheap retrieval.
5. **Every Obsidian capture** flows through the same novelty gate as commit-distill, so personal-knowledge work compounds the system corpus instead of siloing it.
6. **Citation log emerges as the universal outcome substrate** — the data deep-learning needs to graduate from heuristic to learned, the data neural calibration needs to tighten its prediction intervals, the data the router needs to self-tune.

The result is **all 6 systems feeding the same corpus and consuming the same corpus** — no parallel knowledge stores, no re-derivation, no siloed learning.

---

## Decision points for the user

1. **Bind the Obsidian inbox-capture → tribal pipeline now**, or wait until citation log has signal? *(recommend: bind now — Obsidian infrastructure is already shipped per OBSIDIAN-COMPOUND-MS1; this is wiring not building)*
2. **Modify `prismSelfAwarenessEngine.searchTribalKnowledge()` to use the unified embed index**, or run them in parallel until L1 is proven? *(recommend: parallel for 1 week, then swap once citation log shows L1 outperforms fuzzy)*
3. **Per-domain LoRA refresh frequency** — quarterly (default) vs monthly vs on-demand? *(recommend: quarterly — anything more frequent risks catastrophic forgetting per Deep Learning Expert pitfall list)*

Want me to extend the day-1 ship to include the cross-system bridges (Obsidian mirror, Tier-2 precontext, density-router), or stay tight on the original 4 (L1+L2+L4+L6) and queue cross-system for next session?
