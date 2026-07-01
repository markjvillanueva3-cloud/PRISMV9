---
title: Cross-galaxy meta-synthesis (L2/L3) — the compounding of the compounding
type: architecture
status: shipped
shipped: 2026-05-29
slot: alpha
tags: [obsidian-brain, compounding, meta-synthesis, doctrine, embeddings, fleet-amplifier]
---

# Cross-galaxy meta-synthesis (L2/L3)

**Amplifier #1** of the fleet-compounding roadmap (see §Roadmap). B1
([[galaxy-reflection-synthesis]]) produced 34 per-galaxy L1 syntheses. L2 is where
compounding *compounds*: it finds patterns that recur **across** galaxies — the
cross-domain insight no single galaxy's synthesis holds — and L3 promotes the most
cross-cutting to **doctrine candidates** (the fleeting→memory→wiki→CLAUDE.md path).

## Pipeline (`scripts/galaxy-meta-synthesis.mjs`)

1. **Structure (deterministic, free):** load the 34 L1 synthesis **embeddings**
   already in the sidecar → pairwise cosine (`cosineSimInt8`) → threshold graph →
   union-find connected components. No LLM needed to find WHICH domains relate.
2. **Name (LLM, small input):** each cluster's member texts (small → fits Ollama
   context) → `synthesizeViaOllama` (reuses B1's keep-alive-pinned helper) → a
   `META-PATTERN` / `CROSS-DOMAIN RULE` / `CONTRADICTION` triple.
3. **Emit:** `patterns/_meta_synthesis.md` (L2, recall-indexable, advisory-marked)
   + `state/shared/specs/DOCTRINE-CANDIDATES.md` (L3, advisory).

The efficiency insight: the expensive cross-domain *discovery* is free (reuses the
A6/A3 embeddings); the LLM is confined to *naming* clusters whose input provably
fits context. If Ollama is down, the clusters still emit structurally (unnamed).

## Threshold (empirically tuned)

The shared synthesis template inflates the cosine baseline to ~0.88, so the signal
is the top decile. Measured on the 34 real vectors: **0.93** is the knee — tight,
semantically-clean clusters (`{corpus-aggregation,mill,pdf-corpus,pdf-corpus-mill}`,
`{academy,ai-training}`, `{cad,cad-fusion-live}`). 0.92 over-merges via the
cross-cutting `quality` hub (10-domain blob); 0.94 is too sparse. Configurable
`--threshold`.

## Safety

- **Self-reference guard:** `loadSynthesisVectors` skips `_`-prefixed names, so the
  L2 doc never folds into its own next-run input (no meta-of-meta loop).
- **Degenerate-cluster guard (R12 fail-loud):** a cluster spanning >50% of galaxies
  is threshold collapse, not a pattern — excluded from doctrine candidates +
  flagged loudly + marked in the meta doc. (Without it, a mega-cluster would sort
  to the TOP of the doctrine list since candidates rank by domain count.) Fires at
  0.90 (largest 31/34), silent at 0.93.
- **L3 is advisory-only:** `advisoryOnly`+`mustHumanVerify`; NEVER auto-edits
  CLAUDE.md — an operator verifies each candidate before promotion.

## Validation

The `academy·ai-training` cluster's rule — "each domain must build + own its
self-improving AI training system" — **independently rediscovered** the real fleet
doctrine [[feedback_domains_own_ai_training_systems]]. The compounding found a
cross-domain rule by itself. 22 node:test; 2 per-file reviewers PASS.

## Roadmap — 6 fleet-compounding amplifiers (2026-05-29)

The fleet's structural edge over "1 terminal + ephemeral subagents": **persistent,
specialized, parallel** Claude workers. Amplifiers that exploit it:
1. **Hierarchical compounding (L2/L3)** — THIS. Cross-domain meta-patterns. ✅
2. **Continuous/incremental** — event-driven re-synthesis on memory-write (debounced) so syntheses stay fresh. (extends `stop-compounding-budget`.)
3. **Fleet-distributed synthesis** — each domain slot maintains its galaxy's synthesis with ITS OWN Claude (20× parallel, GPU-free, higher quality than 7B).
4. **Closed-loop validation** — helped/refuted signals from 20 chats re-rank/refine syntheses; the brain self-corrects.
5. **Real-time cross-chat propagation** — a discovery reaches the other 19 chats within minutes (chat-bus-backed prioritized recall surface).
6. **Active gap/contradiction detection** — drives new work from the knowledge itself.

Memory: [[reference_alpha_l2_meta_synthesis_2026_05_29]].
