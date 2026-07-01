---
name: reference_india_lora_adapter_engine_dup_2026_06_21
description: "MISC-085 ('surface PRISMLoRAAdapterEngine + IncrementalLearningEngine through prism_ai') is NOT a clean wiring -- it is a DUPLICATION FORK. prism_ai already surfaces a LoRA-adapter registry via lora_adapter_* (LoRAAdapterRegistryEngine, U-LEARN-07); PRISMLoRAAdapterEngine (PP-0.19) is a SECOND overlapping LoRA-adapter-registry engine. Wiring it as a 2nd lora_adapter_* group = duplicate surface. Real resolution = dedup/architecture decision (canonical engine? complementary layers?), NOT a unilateral india wiring. Verified by slot:india 2026-06-21. MISC-186 is STALE (clean import, build green)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.618Z
aliases: reference_india_lora_adapter_engine_dup_2026_06_21
---


**CONTEXT:** slot:india autonomous /loop, 2026-06-21, after exhausting the clean test-reds (FIXES) + WIRINGS rungs. Investigated MISC-085 from `state/shared/specs/MISC-TASKS-INVENTORY.md` as the next GHOST/MISC india unit. R8/dedup read-first surfaced a duplication trap BEFORE any code was written.

**THE TWO OVERLAPPING ENGINES (verified on disk 2026-06-21):**
| | `LoRAAdapterRegistryEngine` (U-LEARN-07) | `PRISMLoRAAdapterEngine` (PP-0.19-U-LLM3) |
|---|---|---|
| file | `src/engines/LoRAAdapterRegistryEngine.ts` (singleton `loraAdapterRegistryEngine`) | `src/engines/PRISMLoRAAdapterEngine.ts` (singleton `prismLoRAAdapterEngine`) |
| purpose | "cross-domain registry of every trained LoRA adapter; one active per (domain, context-key)" | "inventory of LoRA adapters trained by IncrementalLearningEngine; one active per baseModel" |
| persistence | `state/adapters/registry.jsonl` (append-only) | `data/lora-adapters/<id>/prism.json` (folder-per-adapter) + `active.json` |
| key | (domain, context-key) | (adapterId, baseModel) |
| API | sync: `register/resolve/list/stats` (+ setStatus) | async: `register/get/list/activate/activeFor/activeMap/remove/summary` |
| prism_ai surface | **YES** -- `lora_adapter_register/resolve/list/stats` (aiReasoningDispatcher ITER4_AI_ACTIONS lines 165-168, cases ~4513-4530) | **NONE** (only `incrementalLearningEngine.listJobs()` used internally by orchestrationDispatcher:867; PRISMLoRAAdapterEngine itself unreferenced by any dispatcher) |

**WHY MISC-085 IS A FORK, NOT A WIRING (R7/R8):** literally "surface PRISMLoRAAdapterEngine through prism_ai" would add a SECOND `lora_adapter_*`-style action group to the SAME dispatcher that already has one (for the sibling engine). That is a duplicate surface for the same concept ("LoRA adapter registry") -> confusing, violates dedup. The two engines are overlapping (both register/list/track LoRA adapters) but subtly different (cross-domain/context-key vs trainer-output/baseModel) -- they may be REDUNDANT (consolidate) or COMPLEMENTARY layers (trainer inventory feeds cross-domain registry). **Deciding that is an architectural dedup call, not a unilateral india edit.**

**SECONDARY (minor, NOT worth a unit):** the existing `lora_adapter_*` cases use the ITER4 mass-wiring defensive pattern `(loraAdapterRegistryEngine as any).register?.(params as any) ?? { note: "method not callable" }` -- functional today (the real method exists so `?.()` calls it) but loose (`as any` + fake-success fallback). Hardening ONE while 37 sibling ITER4 cases keep the pattern would break convention consistency (R11); skip unless the whole ITER4 block is hardened deliberately.

**RECOMMENDATION to surface (operator / india-architecture):** before any LoRA-adapter-registry wiring, decide canonical: (a) consolidate the two engines into one (retire/merge), or (b) document them as distinct layers with distinct action namespaces (e.g. keep `lora_adapter_*` for the cross-domain registry, add `lora_inventory_*` for the trainer-output inventory) -- only THEN wire. Pairs with MISC-254 (replace `PRISMContextInjectorEngine` + `ConsensusModelPerformanceEngine` WIRE-EXEMPT stubs -- also an india consensus engine question).

**SIBLINGS:** [[reference_india_ai_test_reds_backlog_2026_06_21]] (#1/#5 operator-forks, #3 peer-WIP) -- this is the same "remaining india work is decision-gated, not clean-unilateral" pattern. The clean india test-reds + WIRINGS rungs are EXHAUSTED as of 2026-06-21.
