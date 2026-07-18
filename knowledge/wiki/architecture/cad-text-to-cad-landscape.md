---
title: Text-to-CAD landscape + PRISM's local generation lane
slug: cad-text-to-cad-landscape
kind: architecture
domain: cad
status: shipped
shipped_at: 2026-06-12
shipped_by: claude-f61fa6d7 (slot zulu)
commit: a0bf66dcd3
related:
  - cad-knowledge-index
  - cad-corpus-paths
  - cad-step-toolchain
---

# Text-to-CAD landscape + PRISM's local generation lane (2026-06-12)

Operator directive: delta needs everything to generate any CAD model from print or text, wired so PRISM AI on Ollama does the generation. This entry records the open-source landscape recon and the lane PRISM now runs.

## The landscape (what to plug in / learn from)

| Approach | What it is | PRISM fit |
|---|---|---|
| **CadQuery/build123d + local LLM** | LLM writes parametric Python CAD code on the OpenCASCADE kernel -> STEP for free. Consensus strongest open-source combo (2026). | **LIVE** -- `scripts/cad-text-to-cadquery.mjs` (the LLM caller `CadQueryCodeGeneratorEngine` documented but never had). qwen2.5-coder:32b resident. |
| **Text-to-CadQuery** (arXiv 2505.06507) | Text2CAD + **170K CadQuery annotations**; fine-tuned open LLMs hit 69.3% top-1 exact-match (qwen-coder class). | Dataset = delta/india LoRA corpus (U-DELTA-CQ-DATASET). HF: Text-to-CadQuery/Text-to-CadQuery. |
| **Seek-CAD** (arXiv 2505.17702) | TRAINING-FREE self-refined generation on DeepSeek-R1-32B local + RAG over a CAD-code corpus. | deepseek-r1:32b resident; U-DELTA-SEEKCAD-LOOP is the refine-loop unit. |
| **STEP-LLM** (arXiv 2601.12641) | Direct NL->STEP (ISO 10303) generation, >95% renderability. | Learn-from: grammar-constrained STEP output; pairs with the inch-unit guard + proven emitters. |
| text-to-cad harness (MIT, build123d) / NURBGen / FreeCAD-script-RAG | Agent-driven code-CAD harnesses. | Pattern reference; PRISM's own lane supersedes the harness need. |

## PRISM's lane (what runs today)

`text request -> CadQueryCodeGeneratorEngine.getCodeGenPrompt() (canonical, dist import) + HARD-CODED JM doctrine (inches->25.4 explicit, spark-gap rule, periodic-B-spline ban, parametrize-all) + feature-template names (RAG-lite) -> qwen2.5-coder:32b /api/generate -> python fence extract -> structural gates (CAD import + STEP export + inch-conversion; prose never stages) -> state/shared/cad-text-gen/<slug>-<ts>/ -> execution self-activates when build123d/cadquery lands in portable Python (engine's cadquery-executor.py is the alternate lane).`

## Live validation set (first 3 generations, 2026-06-12)

1. **1in cube + .25in center hole** -> 646 chars valid parametric CadQuery. Flaw: spark-gap over-applied to a non-electrode hole.
2. **Sinker-EDM electrode (.5in sq pocket, .25in shank)** -> 766 chars; gap CORRECTLY applied to burning surfaces; flaw: also applied to the SHANK (holder interface, not a burning surface).
3. **4x6x1.25in die plate, 4x .375in holes on 3x5 pattern** -> 1054 chars, clean (IN=25.4, parametric, correct pattern; no spurious gap).

Lessons for delta's canonical prompt: (a) the electrode conditional needs sharper scoping (burning surfaces ONLY, never shank/holder); (b) run-to-run stochasticity at temp 0.2 means the validate/refine loop (Seek-CAD pattern) is mandatory before any STEP reaches a machine; (c) structural gates catch prose/non-CAD 100% so far -- domain-rule precision is where eval effort goes.

## Pointers
- Bridge: `scripts/cad-text-to-cadquery.mjs` (+tests) -- staged outputs in `state/shared/cad-text-gen/`
- Buildout package: `state/shared/specs/DELTA-CAD-GALAXY-MAX-BUILDOUT-2026-06-12.md`
- Nightly UI-knowledge feeds: night-queue ids fusion-ui-navigation / fusion-api-scripting / mastercam-ui-navigation / hypermill-ui-navigation
- Engine surface: cadDispatcher `cadquery_*` actions (generate_script / validate_syntax / execute_script / codegen_prompt)
