---
name: backend-helper_synthesis
description: "[auto-synth · verify] Compounding synthesis of the backend-helper domain — recurring patterns, decisions, open threads distilled from 11 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: backend-helper
  synthesizedFrom: 11
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T01:45:27.433Z
  sourceHash: 97a7f8e50c6c
  advisoryOnly: true
  mustHumanVerify: true
---

# backend-helper — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 11 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Asset verification against the canonical tree** – every generated script, wiki or hook is cross‑checked with the `MAIN` repository (H:/prism) rather than a stale slot worktree [reference_bravo_verify_against_main_not_worktree_2026_05_29].  
- **Dispatcher path sanity check** – engine “green” status does not guarantee that the dispatcher/orchestrator route is functional; a real round‑trip test (engine unit test + resolvable dispatcher action) is required [feedback_dispatcher_path_green_not_engine_green].  
- **Per‑slot synthesis bundles** – each slot emits its own `<galaxy>_synthesis.md` which feeds the consumer arm of the Obsidian‑brain stack (AMP‑CONSUME) after RECALL [reference_alpha_amp_consume_synthesis_line_2026_05_30].  
- **Model roster hygiene** – the Blackwell roster is refreshed (qwen2.5‑coder, gpt‑oss, etc.) and auto‑discovery of skills is deliberately suppressed; hooks fire automatically [reference_local_llm_routing]; cascade defaults must be updated to avoid retired models [reference_cascade_defaults_retired_model_2026_06_09].  
- **High‑ROI wiki loop** – shipping “BACKEND‑DEV‑LOOP/U‑PRISM‑DEV‑WIKIS‑HIGH‑ROI” established a repeatable pattern of short, high‑impact documentation cycles that feed back into code generation [reference_post_ship_backend-dev_loop_u-prism-dev-wikis-high-roi].  
- **Path glob verification before enshrinement** – any file path referenced in a galaxy doc, hook or skill is glob‑checked for existence to prevent hallucinated assets [feedback_bravo_verify_cited_paths_before_enshrining].  

## Key decisions & rules
1. **Always validate against MAIN** – reject engine/hook “missing” warnings unless the asset exists on the canonical tree (prevents accidental deletions).  
2. **Dispatcher green ≠ engine green** – enforce a round‑trip test suite that includes both engine unit tests and dispatcher actions before marking a path as green.  
3. **Retire stale models from cascade defaults** – default `two_pass_cascade` must point to the current Blackwell roster; any reference to retired qwen2.5‑coder variants is an error.  
4. **Suppress skill auto‑discovery** – rely on explicit hook registration; automatic discovery is turned off to keep routing deterministic.  
5. **Glob‑verify all cited paths** – a pre‑commit hook runs `glob` checks on every path that will be written into documentation or code.  
6. **Per‑slot synthesis feeds consumer arm** – AMP‑CONSUME consumes the slot‑specific `<galaxy>_synthesis.md`; any deviation breaks downstream recall pipelines.  

## Open threads
- **Automated enforcement of asset verification**: design a CI step that uniformly applies MAIN vs worktree checks across all slots (currently manual in Bravo).  
- **Model roster synchronization**: establish a source‑of‑truth service to push Blackwell roster updates into cascade defaults and routing tables without manual patches.  
- **Integration of LoRA galaxy synthesis data**: define how the `--source galaxy` mode dataset (512 Alpaca pairs) should be consumed by backend‑helper pipelines for continual model fine‑tuning [reference_lora_galaxy_synthesis_feeder_2026_06_10].  
- **Clarify engine‑green vs dispatcher‑green monitoring**: create a unified status dashboard that distinguishes the two and surfaces round‑trip failures early.  
- **Scaling AMP‑CONSUME consumer arm**: evaluate performance and fault tolerance when multiple slots emit synthesis bundles simultaneously.
