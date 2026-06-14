---
name: knowledge-conversion_synthesis
description: "[auto-synth · verify] Compounding synthesis of the knowledge-conversion domain — recurring patterns, decisions, open threads distilled from 21 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: knowledge-conversion
  synthesizedFrom: 21
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T04:48:02.871Z
  sourceHash: 42a218b70d27
  advisoryOnly: true
  mustHumanVerify: true
---

# knowledge-conversion — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 21 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Auto‑distillation after each ship** – every “U‑COURSE‑FORGE” module is followed by a distilled learning summary (e.g., [reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-conversions-doc-reflection], [reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-expr]).  
- **Forge pipeline** – courses are systematically converted into node‑level artifacts via a series of “forge” steps (P1, P6, FEM, GD, LAG, etc.) that each introduce a specific algorithmic pattern ([ref 10], [ref 11], [ref 7], [ref 8], [ref 9]).  
- **Doc‑reflection layer** – after each conversion a documentation surface is generated (e.g., [reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-doc-reflection] and its siblings for expr, fdm, gd, lag). This keeps API docs in lockstep with code.  
- **Dispatcher wiring** – a central dispatcher design decides how forged nodes are wired together ([ref 2]).  
- **Sandboxed expression evaluation** – the SafeExpressionEvaluator is reused as the keystone sandbox for any user‑supplied code ([ref 4]).  
- **Bulk stub emission** – the stubs emitter auto‑generates proposal stubs for new conversions, driven by a CLI test suite of 13 cases ([ref 13], [ref 14]).  
- **Verification lanes** – algorithm ports are verified in dedicated “lanes” (e.g., lane B with 52 algorithms, lane C with full routing tests) to guarantee correctness before promotion ([ref 15], [ref 16]).  
- **Iterative session refresh** – each loop iteration updates the full session summary to keep cross‑session context current ([ref 19]).  

## Key decisions & rules
- **Use SafeExpressionEvaluator as the sole sandbox for all dynamic expressions** (Option A keystone) – prevents arbitrary code execution across all forge modules. [ref 4]  
- **Dispatcher must be wired centrally; any new node type is registered via the dispatcher design spec** to avoid ad‑hoc coupling. [ref 2]  
- **Every conversion module must emit a doc‑reflection artifact**; missing documentation blocks are treated as build failures. (applies to expr, fdm, gd, lag, etc.) [ref 3], [ref 5], [ref 6], [ref 8], [ref 9]  
- **OperatorSplittingMethod is the canonical pattern for first‑order course→node conversion**; subsequent conversions should extend rather than replace it. [ref 10]  
- **LinearStateSpaceModel defines the third‑order conversion template** and must be present for any linear system representation. [ref 11]  
- **Bulk stub emission CLI must pass all 13 cases before merging new forge proposals** – ensures consistency of auto‑generated stubs. [ref 14]  
- **Verification lane B requires 100 % pass on the 52 algorithm port suite**; any deviation blocks promotion to production. [ref 15]  
- **Course‑data routing pipeline (lane C) must achieve a perfect 30/30 test score** before being accepted as the canonical data flow. [ref 16]  
- **Deferred‑tail integration points to CLAUDE.md doctrine; any future model extensions must reference this pointer** to maintain doctrinal continuity. [ref 17]  
- **LoRA training rotation is closed via KIP outcome; subsequent LoRA updates must follow the same rotation protocol**. [ref 18]  

## Open threads
- **Unified doc‑reflection schema:** While each module generates its own surface, a single schema to harmonize these artifacts across all forge steps remains undefined.  
- **Scaling stub emission beyond 13‑case CLI:** The current test suite covers limited scenarios; expanding coverage for emerging conversion patterns is pending.  
- **Deferred‑tail integration roadmap:** How future model upgrades will consume the CLAUDE.md pointer without breaking existing pipelines is still under discussion.  
- **Verification expansion:** Extending lane B verification beyond 52 algorithms and adding automated regression checks for lane C are open tasks.  
- **Cross‑galaxy LoRA signal consolidation:** Integrating the per‑galaxy synthesis brains into a coherent training dataset (see [reference/reference_lora_galaxy_synthesis_feeder_2026_06_10]) needs further design work.  
- **Expression sandbox enhancements:** Determining whether additional safe primitives should be added to SafeExpressionEvaluator for more complex scientific expressions remains undecided.
