---
title: Per-galaxy reflection synthesis (B1) — the compounding arm
type: architecture
status: shipped
shipped: 2026-05-29
slot: alpha
tags: [obsidian-brain, compounding, synthesis, ollama, patterns, recall]
---

# Per-galaxy reflection synthesis (B1)

The **compounding arm** of the Obsidian brain. The vault *captures* ~11k memories
but never *compounded* them — the `patterns/` namespace was empty. B1 distills
each galaxy DOMAIN's accumulated memories into one compounding
`knowledge/memories/patterns/<galaxy>_synthesis.md`. Closes the second half of
the "captures-but-does-not-compound" research (the recall half is A6/A3:
[[hybrid-memory-retrieval]]).

## Pipeline (`scripts/galaxy-reflection-synthesis.mjs`)

Per galaxy:
1. **gather** — `gatherGalaxyMemories`: run `runMemoryIndexSearch` (the A6/A3
   hybrid recall) over a domain query built from the galaxy slug + the brain's
   own `extractGalaxyDomainText` (B1 is the first *consumer* of the recall A6/A3
   built/tuned). Filter to an ALLOWLIST `RAW={reference,feedback,project,mistakes}`.
2. **synthesize** — `buildSynthesisPrompt` → `synthesizeViaOllama` (`/api/generate`,
   `qwen2.5-coder:7b`, temp 0.2, "do NOT invent facts", `<think>` stripped).
3. **write** — `buildSynthesisDoc` (patterns frontmatter) → `writeSynthesisDoc`
   (atomic `.tmp`+rename) to `knowledge/memories/patterns/<galaxy>_synthesis.md`.

`patterns` is already in `DEFAULT_NAMESPACES`, so the synthesis doc re-indexes on
the next `build-memory-index-sidecar.mjs` run → becomes **recall-discoverable**.
Verified: `patterns/lathe_synthesis` ranks #2 on a lathe domain query — **the
loop closes** (raw memories → synthesis → recall → next chat).

## Axis niche (dedup)

The DOMAIN axis — distinct from the existing **TIME** axis
(`hermes-self-reflect-populater.mjs` weekly, `WeeklySynthesisEngine`) and
**CONNECTION** axis (`hermes-dream-cycle-synth.mjs` Jaccard → `dreams/`). No
output-path collision (each writes a different namespace).

## Safety properties

- **Recursion guard** (load-bearing): the RAW allowlist EXCLUDES `patterns` +
  `galaxies`, so the job never folds prior syntheses or a brain's own summary
  back into its input → no degenerate self-reinforcement. Pinned by a
  rule-not-fixture test.
- **Fail-loud (R12)**: ollama preflight before the batch (exit 1 if down);
  per-galaxy try/catch (one failure ≠ batch abort); `>50%` fail → exit 1;
  empty/short (<40 char) synthesis → failure not written.
- **Hallucination containment** (Reviewer-B P1): patterns docs are *fleet-wide*
  recall-discoverable (the precheck injector surfaces them into every chat's
  context). The recall injector renders name+description+opening — NOT the body —
  so the caveat lives in the **description** (`[auto-synth · verify] …
  LLM-generated; verify against source memories`) plus `advisoryOnly:true` +
  `mustHumanVerify:true` frontmatter + a body ⚠ banner. A hallucinated rule
  never looks authoritative to the chat recall surfaces it to.

## Operate

```
node scripts/galaxy-reflection-synthesis.mjs --galaxy lathe        # one galaxy
node scripts/galaxy-reflection-synthesis.mjs --all                 # all 34 (cron rollout)
node scripts/galaxy-reflection-synthesis.mjs --galaxy x --dry-run  # gather only, no ollama
```
Then rebuild the sidecars (`build-memory-index-sidecar.mjs` + `build-memory-embeddings-sidecar.mjs --resume`) to make the new syntheses recall-discoverable. Knobs: `--model`, `--topk`, `--limit`.

## Tests + lesson

`scripts/galaxy-reflection-synthesis.test.mjs` (21 node:test). Pure-core +
injected search/fetch/fs. Reviewer-converged fixes: `ollamaPreflight` made
injectable + tested (the load-bearing fail-loud gate was uncovered); the
namespace guard pinned by an all-4-RAW + both-forbidden fixture (rule, not
fixture). **P2 follow-up:** a `main()` subprocess oracle (the batch loop +
`MAX_FAIL_FRACTION` exit are untested — the "hermetic fakes don't prove wiring"
class) + a `topK*2` starvation-boundary pin. Memory:
[[reference_alpha_b1_galaxy_reflection_2026_05_29]].
