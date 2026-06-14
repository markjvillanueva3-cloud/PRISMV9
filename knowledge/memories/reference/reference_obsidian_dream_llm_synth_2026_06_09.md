---
name: reference_obsidian_dream_llm_synth_2026_06_09
description: "Q9 — added an optional local-LLM (Blackwell qwen2.5-coder:32b) 'why these connect' rationale pass to the Hermes dream-cycle (nightly Obsidian-graph cron). Bare Jaccard edges now optionally carry a one-sentence latent-insight rationale. Default-OFF, fail-open, byte-identical default path. $0 Claude tokens. LIVE-verified, 43/43 tests."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.231Z
aliases: reference_obsidian_dream_llm_synth_2026_06_09
---


# Dream-cycle local-LLM rationale (Q9, 2026-06-09)

**What.** `scripts/hermes-dream-cycle-synth.mjs` is a nightly cron (Windows
scheduled task) that walks ALL memos, surfaces cross-memo connections by
keyword-set Jaccard, and writes `knowledge/memories/dreams/<date>.md` with
`[[A]] ↔ [[B]] — shared: kw…` edges for Obsidian's graph view. It told you THAT
two notes share vocabulary, never WHY. Q9 adds an OPTIONAL local-LLM one-sentence
"latent insight" rationale per top edge — context EXPANSION (explained
connections), not just denser edges. On-goal: local LLM + vault value, $0 Claude
tokens (resident Blackwell).

**Ship** (`c3dc47ed23` + P2 `c9d1e590cf`):
- `scripts/lib/dream-llm-annotate.mjs` (NEW): `readableName`/`buildConnectionPrompt`/
  `cleanRationale` (pure) + `annotateConnections` (async, top-N by Jaccard,
  per-edge fail-open). Vault-safe cleaner drops NONE/empty/over-30-word/multi-line.
- `hermes-dream-cycle-synth.mjs`: `synthesizeDreamMarkdown` renders `↳ _rationale_`
  ONLY when present (default path byte-identical — proven by the reviewer
  checking out HEAD~1: old==new 1014B); footer honestly flips "(no LLM)" ↔
  "+ local-LLM rationale"; new async `runWithSynth()` + CLI `--llm-synth` /
  `PRISM_DREAM_LLM_SYNTH=1`. Underscore-escape in the render (P2(b)).

**Two debugging lessons (R8/R12):**
1. **Reasoning-model starvation.** First cut routed through `resolveSynthesisModel`,
   which prefers a REASONING model (gpt-oss:120b). At `numPredict:80` a reasoning
   model fills its `thinking` channel and returns an EMPTY `response`
   (`done_reason:length`) → `callOllama` !ok → 0 rationales. FIX: use the CODER
   model (qwen2.5-coder:32b) directly for a short structured-prose task; knob
   `PRISM_DREAM_LLM_MODEL`. A one-sentence rationale is a fast-coder job, not a
   120b-reasoner job.
2. **Cold-load timeout.** 8000ms timed out the first cold 32b load → 0 rationales;
   raised to 30000ms (nightly cron, not hot-path; keep_alive warms later edges).

**LIVE proof:** `--llm-synth` on a 2-memo corpus → `llm_annotated:1`, edge rendered
`↳ _Kienzle force and mill spindle load both relate to cutting forces affecting
chip formation and tool wear…_`, footer flipped. Default run → 0 rationale,
"(no LLM)". 43/43 tests (31 backward-compat + 12 new). Knobs:
`PRISM_DREAM_LLM_{SYNTH,MODEL,TOP_N,MAX_WORDS,TIMEOUT_MS}`.

**Deferred:** P2(a) `runWithSynth` duplicates `run()`'s write tail (refactoring
the proven byte-identical `run()` adds risk for no functional gain). The nightly
cron stays on the default (no-LLM) path — opt-in via the knob/flag only.
Q9 of [[reference_obsidian_vault_synergy_queue_2026_06_09]]. Pairs with
[[reference_obsidian_learning_revival_2026_06_08]] (the dream-cycle revival).
