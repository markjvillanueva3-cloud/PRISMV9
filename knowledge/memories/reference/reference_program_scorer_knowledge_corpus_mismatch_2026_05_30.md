---
name: reference_program_scorer_knowledge_corpus_mismatch_2026_05_30
description: "RLHF reward/safety engines that score PROGRAM output (G-code + discharge/feed safety) score a KNOWLEDGE/advisory training corpus artificially negative — build a SEPARATE knowledge-track eval; do not reuse the program scorers"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.123Z
aliases: reference_program_scorer_knowledge_corpus_mismatch_2026_05_30
---


# Program-output RLHF scorers mismatch knowledge/advisory corpora (slot mike / wedm, 2026-05-30)

**Finding (U-KNOWLEDGE-EVAL):** the WEDM LoRA eval triad — `WEDMLoRARewardShapingEngine` (G-code syntax reward) + `WEDMLoRASafetyEvaluatorEngine` (discharge-parameter safety) — scores the 171-pair **knowledge** corpus (instruction → *advisory text*, not raw NC) **artificially negative**: advisory text has no G-code to reward and no discharge params to safety-check. This is a **corpus↔evaluator mismatch, not a corpus defect**.

**Fix:** a separate **knowledge-track** eval — `scripts/eval-wedm-knowledge-corpus.mjs` — with three axes that DO apply to advisory text: `instruction_following` (recall of instruction's salient terms), `grounding` (distinct concrete-anchor categories /4: G/M/E/H codes, numeric+unit, named wire/machine), `reasoning` (authoritative `WEDMLoRAReasoningEvaluatorEngine` under `npx tsx`; labeled lean proxy under plain `node`). Pure-core + injected-reader (pure fns zero engine import → node:test-able; engine dynamic-imported only in main()).

**Honest scope:** the metric is a lexical **relevance + specificity SCREEN**, NOT a factual-correctness gauge — gameable by echoing the instruction + sprinkling one code + one numeric+unit + a "because". `pass_rate` ≈ "on-topic and concrete", not "correct". Caveat is stamped in both the header and the emitted `knowledge-eval-report.json`.

**Reusable across the fleet (broadcast to india,whiskey,foxtrot,kilo,quality):** lathe/mill/cam each have analogous `*LoRAReasoningEvaluatorEngine` / reward / safety scorers. Any galaxy training an LLM on KNOWLEDGE/advisory text (vs program output) must build its own knowledge-track eval rather than running its program scorers on the wrong corpus. The reasoning evaluator's 5 axes (coherence/domain/justification/structure/completeness) ARE reusable for knowledge text; the reward/safety engines are NOT.

**Baseline (171 pairs, proxy axis):** knowledge_score 0.523 · instruction_following 0.65 · grounding 0.43 (weakest → answers under-cite concrete anchors = next corpus-enrichment target).

See [[feedback_ai_upgrade_broadcast_protocol]] (this upgrade was broadcast per that doctrine). Pairs with the wedm galaxy brain `mcp-server/src/engines/wedm/MEMORY.md`.
