# DELTA CAD-GALAXY MAX BUILDOUT — work package (zulu → delta, 2026-06-12)

**Operator directive:** "populate delta's galaxy with maximum information... all the knowledge and context necessary to generate any cad model from print or text... open source models we can plug in or learn from... wiki, tribal, memories, resources... how to navigate and use the ui of fusion, hypercad/hypermill and mastercam... everything hard coded, bridged and wired so we can utilize the prism ai systems on ollama to do cad generation."

**Lead: delta** (galaxy owner). **Co-owners:** india (LoRA/training arm), quebec (mcp-cadquery merge), xray (print→CAD OCR arm). **Zulu delivered:** this package + night-lane feeds (below) + open-source recon.

## What ALREADY exists (R8 — build on, never duplicate)
- **Text→CAD in-repo:** `cad_text_parse` + `cad-text-supported-features` + `cad-neural-extract-features-text` (cadDispatcher), `UnifiedCADCodeGeneratorBase.ts`, `CADReasoningChainEngine.ts`, `BlueprintToCADGenerationEngine.ts`, `cad-action-templates/` (14 *.actions.json), `cad-feature-templates/INDEX.json`, the proven multi-prism STEP emitter ([[reference_delta_proven_step_emitter]]).
- **Print→CAD:** xray's resumable multi-page OCR loop (7794-print corpus) + CAD-CLOSED-LOOP-MS0 dimensional signals (radii/bbox already mined into LoRA data).
- **Corpus:** 129,306 CAD/print files mapped in [[cad-corpus-paths]]; seats: Mastercam X8 (RUNNING), hyperMILL v31 (RUNNING — NOT v33), FreeCAD bin.
- **Knowledge:** [[cad-knowledge-index]] (88 engine wiki entries + lessons + GSD), cad-tribal-corpus.jsonl (21), delta CAD-awareness inject hook.
- **Local models RESIDENT in Ollama (verified /api/tags today):** qwen2.5-coder:32b, deepseek-r1:32b, gpt-oss:120b, qwen3-coder:30b — see model fit below.

## Open-source text-to-CAD landscape (zulu recon, 2026-06-12) — plug in or learn from
1. **CadQuery/build123d + local LLM = the strongest open-source combo** (parametric STEP for free; OpenCASCADE kernel, same as FreeCAD). The [text-to-cad harness](https://github.com/topics/text-to-cad) (MIT, Apr 2026, build123d-based) drives exactly this from a coding agent. PRISM fit: **quebec's pending `mcp-cadquery` merge is the integration point**; portable Python 3.14 exists.
2. **[Text-to-CadQuery](https://arxiv.org/html/2505.06507v1)** — Text2CAD dataset augmented with **170K CadQuery annotations**; fine-tuned open LLMs hit 69.3% top-1 exact-match. PRISM fit: the dataset is the LoRA corpus delta+india need; the fine-tune target class includes qwen-coder (ALREADY resident). HuggingFace: Text-to-CadQuery/Text-to-CadQuery.
3. **[Seek-CAD](https://arxiv.org/html/2505.17702v3)** — training-FREE self-refined CAD generation on **DeepSeek-R1-32B local** + RAG over a local CAD-code corpus. PRISM fit: deepseek-r1:32b is resident; our RAG substrate (qdrant + tribal + wiki) is live — this is the fastest path to working local text→CAD WITHOUT training.
4. **[STEP-LLM](https://arxiv.org/abs/2601.12641)** (Jan 2026) — direct natural-language→STEP generation, >95% renderability. Learn-from: their STEP-grammar constraint approach; pairs with our STEP emitters + inch-unit convention guard.
5. Also surveyed: [LLMs for CAD survey](https://arxiv.org/pdf/2505.08137), NURBGen (AAAI 2026), FreeCAD-script-RAG projects, [open-source tool roundup](https://www.getleo.ai/blog/open-source-text-to-cad-tools-free).

## Unit queue (dependency order, R13)
- **U-DELTA-SEEKCAD-LOOP** (delta, HIGHEST ROI / training-free): Seek-CAD-style loop — prompt → deepseek-r1:32b (or qwen3-coder:30b) generates CadQuery/build123d code w/ RAG over cad-tribal+wiki+feature-templates → execute in portable Python → STEP → validate via `cad-analyze-step.mjs` + the regen/compare harness → self-refine ≤3 iters. Wire as `prism_cad:cad_generate_from_text` action; route model via ask-ollama lane. HARD RULES: inch-unit guard, proven emitter only, archetype-match-before-scale.
- **U-DELTA-CQ-DATASET** (india+delta): pull the 170K Text-to-CadQuery dataset → filter/convert to fleet LoRA rows (galaxy:cad) → registers in fleet-training-corpus-inventory (clobber-guard now protects the combined corpus). Optional later: LoRA fine-tune of qwen2.5-coder on Blackwell (india's torch arm).
- **U-QUEBEC-MCP-CADQUERY-MERGE** (quebec, UNBLOCKS #1): land the pending mcp-cadquery merge; expose execute-cadquery as a local tool the Ollama bridge can call.
- **U-DELTA-UI-KNOWLEDGE** (delta + zulu-DONE): UI navigation corpora for Fusion / hyperCAD-hyperMILL(v31!) / Mastercam(X8). Zulu seeded 4 night-lane extraction queries (fusion-ui-navigation, fusion-api-scripting, mastercam-ui-navigation, hypermill-ui-navigation) — tips stage nightly, promote via promote-youtube-staged. Delta: deep passes via /video-learn + in-house corpus (OPEN MIND E-Learning + Mastercam training dirs per [[cam-corpus-paths]]) through lima's pypdf extractor → wiki/code-tribal entries per UI workflow.
- **U-DELTA-PRINT2CAD-BRIDGE** (xray+delta): wire xray's OCR dim-extraction output (per-page dims JSONL) as input contract to BlueprintToCADGenerationEngine → same validate/refine loop as #1. The closed-loop training pair generator (print→model→compare) already exists in CAD-CLOSED-LOOP-MS0.
- **U-DELTA-GALAXY-CONTENT-SWEEP** (delta, bravo's pattern): populate galaxy MEMORY/CLAUDE/PATHS/TOOLBELT + wiki entries for every CAD workflow; mine the 129K-file corpus inventory (count + schema + samples per DATA-CONTENTS doctrine); grow cad-tribal-corpus 21 → 200+ via promoted night extractions.

## Zulu's standing feeds (live tonight)
Night lane 22:23: 4 new CAD UI queries staged nightly (rotation 3/night, cooldown 7d) + brain floor (synthesis/embeddings) + LoRA corpus assembly — delta's knowledge substrate compounds without manual runs.
