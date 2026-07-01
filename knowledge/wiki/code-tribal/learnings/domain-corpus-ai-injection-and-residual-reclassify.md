---
title: Domain tribal-corpus AI injection + Ollama residual reclassify
tags: [code-tribal, ai-systems, ollama, knowledge-feeder, R15, R16, R12]
slot: papa
date: 2026-06-24
commits: [U-PAPA-DOMAIN-CORPUS-CONSUMER, U-PAPA-DOMAIN-RECLASSIFY-OLLAMA]
related: [[zulu-domain-feeder-canonical-wire]] [[feedback_read_full_content_not_titles]]
---

# Domain tribal-corpus AI injection + Ollama residual reclassify

Resumed zulu's all-domain knowledge feeders (`scripts/build-domain-knowledge-feeders.mjs`:
1210 resource-pdf specs -> per-domain `state/shared/<domain>-tribal-corpus.jsonl`). Closed
two gaps zulu's first pass left.

## Finding 1 -- phantom consumer (R15 orphan)

zulu's commit `U-ZULU-FEEDER-CANONICAL-WIRE` message said *"Consumer-side embed/getDomainCorpus
wiring routes to india (AIResourceLearningEngine)."* **`getDomainCorpus` did not exist.** Only
`getCadCamCorpus()` (cad+cam) was wired. The 10 general per-domain corpora were ORPHAN outputs
no AI consumer read -- the producer shipped without its consumer.

Fix: real `AIResourceLearningEngine.getDomainCorpus()` (pointers + LIVE line-counts for the 10
non-cadcam domains) + `ai_domain_corpus_pointers` action in `aiReasoningDispatcher`. 18/18 tests.

**Lesson:** a commit message is a *title*, not proof. Grep for the symbol before trusting that a
consumer/wiring exists -- "existence != content; read the body not the title", applied to a commit
claim. (`[[feedback_read_full_content_not_titles]]`)

## Finding 2 -- the residual had no real Ollama rescue path (R16)

zulu named `cadcam-reclassify-ollama.mjs` as the Ollama "next pass" for the 769 keyword-unclassified
specs -- but that script only emits cad/cam verdicts on a DIFFERENT corpus
(`cadcam-consolidated-corpus.json`); it never touched the 12-domain residual. Built
`scripts/reclassify-domain-feeders-ollama.mjs` (multi-label via local Ollama, resumable conf-gated
sidecar `domain-classify-overrides.json`); feeder `resolveDomains()` applies high-conf (>=0.7)
overrides for the residual, GIGO-safe + ownership-guard preserved.

Result: 65 specs rescued (unclassified 769->704); corpora 373->475 entries (post-processor 6->63,
mill 39->71, lathe 12->18, speed-feed 4->8, wedm 0->2). The 704 remaining are genuinely
non-manufacturing (mostly `mit_courses_10_34` numerical-methods PDFs) -- correctly left
unclassified (R12, no GIGO). post-processor's ~10x jump = the regex `\bpost ?process\b` cannot
match the underscore in `post_processor` filenames.

## Lesson 3 -- model selection for a classification offload is accuracy-critical

A "neither" verdict marks the slug *decided*, so resumability never retries it -- a weak model
permanently loses rescuable knowledge (GIGO by omission). Measured on the residual:

| model | rescue rate | verdict |
|---|---|---|
| qwen2.5-coder:7b | 44/469 = 9.4% | too weak -- returns "neither" for 90% |
| qwen2.5-coder:14b | 100% on easy cluster, correct "neither" on the MIT tail | **use this** |
| qwen2.5-coder:32b | 7/8 accurate | accurate but slower |

Use 14b+ for domain-classification offloads; the conf-gate (0.7) protects against over-confident
wrong verdicts. Purge a weak model's verdicts from the sidecar before re-running with a stronger one.

## Lesson 4 -- background node runs + the `; tail` exit mask

Long background `node` reclassify runs were killed early (~5 items) here. Foreground time-boxed
chunks are reliable because the script checkpoints every item (resumable -- a timeout-kill loses
nothing). And NEVER wrap a `run_in_background` command as `node ... ; tail log` -- the task exit code
then reflects `tail` (always 0), MASKING node's real fate.

## Regen / query

```bash
node scripts/reclassify-domain-feeders-ollama.mjs --limit N --model qwen2.5-coder:14b
node scripts/build-domain-knowledge-feeders.mjs            # applies the overrides
```
Query the injected corpora: `prism_ai` action `ai_domain_corpus_pointers`, or
`aiResourceLearningEngine.getDomainCorpus()`.
