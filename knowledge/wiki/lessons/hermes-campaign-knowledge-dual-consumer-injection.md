---
title: Hermes parallel-agent knowledge campaign — dual-consumer injection (tribal L1/RAG + fleet LoRA)
type: lesson
domain: ai-training
slot: india
date: 2026-06-30
tags: [hermes, tribal, rag, lora, producer-consumer, converter-reuse, arith-caution, r8, r15]
commits: [23819d2c7a, 7793b42000]
related: [[hermes-enrichment-injection-and-gnn-phantom-prune-caveat]], [[reference_hermes_knowledge_campaign_dual_consumer_2026_06_30]], [[feedback_wire_test_validate_all_galaxies]]
---

# Hermes campaign knowledge → both AI-training consumers

## Context

Zulu ran a Hermes **parallel-agent campaign** — 6 Grok-reasoning agents × 2 waves → **84 cited,
R12-verified knowledge items** across the 6 primary print-to-program domains (mill/lathe/wedm/cam/
post/cad), staged by `stage-hermes-knowledge-tips.mjs` into
`state/shared/staging/hermes-knowledge-tips-staging.json`. Both source specs said explicitly: *staged,
NOT written to the live index — golf/india own the shard-safe writer.* `grep` proved **0 of the 84
items were in the live tribal index**: producer-alive / consumer-dead.

## Two distinct Hermes producers — don't conflate

| | Enrichment **LOOP** | Parallel-agent **CAMPAIGN** (this lesson) |
|---|---|---|
| producer | `hermes-domain-enrichment-loop.mjs` (cron) | `stage-hermes-knowledge-tips.mjs` (over the 2 wave specs) |
| staging | `hermes-enrichment-loop-tips.json` | `hermes-knowledge-tips-staging.json` |
| id namespace | `hkl-<dom>-NNN` | `hk-w<wave>-<dom>-NNN` |
| knowledge in | `title` | `body` (rule + formula/threshold + `[ARITH?]` caution) |

Both feed the same two AI-training consumer surfaces, through the same hardened tools — but as
**separate sources** (distinct id namespaces, so per-tip hash-skip dedups cleanly and no cross-source
collision is possible).

## The dual-consumer closure (R15: wire the one corpus to EVERY natural consumer)

1. **Tribal L1 / RAG** (`23819d2c7a`) — new `hermes-knowledge` source in
   `embed-pdf-tribal-tips-into-index.mjs`: `collectHermesKnowledgeTips` reads the campaign staging,
   embeds the richer `body`, appended to the **single `DEFAULT_SOURCES` const** (so the no-flag cron
   path can't silently drop it — the exact drift-bug class fixed in `97c392ce75`). Live: 84/84
   embedded, index 146049→146133 (+84); `tribal-rerank` returns the mill + lathe campaign items as the
   **#1 hit** (1.594 / 1.646), both waves retrievable.
2. **Fleet LoRA** (`7793b42000`) — `hermes-enrichment-to-alpaca.mjs` **reused verbatim** (its
   converter is generic over the capture-tip schema + CLI-parameterized `<staging> --out`) →
   `hermes-knowledge-dataset.jsonl` (84 rows, training-ready, uniqueRatio 1.0, contradiction 0);
   registered `hermes-knowledge-lora` in the fleet inventory. Live: assembler "84 added, 0 dup, 0
   invalid"; `fleet-lora-combined.jsonl` 20516→20600 (+84 exact).

## Generalizable lessons

- **Reuse > fork when the tool is schema-generic.** The alpaca converter needed **zero** code change —
  a schema-generic + CLI-parameterized producer serves a second staging source with only a new
  inventory registration. The tribal embedder, by contrast, *did* need a new collector (per-source id
  namespace + field mapping differ). Read the tool before assuming you must extend it (R8).
- **Carry the `[ARITH?]` caution into every surface's text.** 6 items had an LLM worked-number slip.
  The stager bakes "recompute the number" into the body; both the tribal `text` and the LoRA `output`
  carry it, so no surface ever teaches a bare wrong number — only rule + formula + caveat.
- **Respect the advisory boundary on both surfaces.** `buildTipEntry` drops the `safety:gate-candidate`
  tag (retrieval is pure advisory cosine; nothing gate-relevant enters a fireable field); the LoRA
  source is `advisory:true` (w=0.5). Neither auto-fires a machine-motion/S(x) gate — matching the
  specs' "specialist confirms the threshold vs the cited page before it drives a gate."
- **Scope honesty (R12).** Not every AI surface the work order names fits every corpus: the GNN is a
  *wiring-inference* model (domain-knowledge items don't feed it; its below-gate AUROC is a soul-gated
  ref-pool/GPU lever), and CAG cold-anchors *doctrine* (unreviewed advisory knowledge belongs in RAG,
  not CAG). Tribal-L1/RAG + LoRA are the two real, in-scope consumers — closing both is the complete
  delivery. Producing further waves is the Hermes-orchestrator (zulu) lane.
