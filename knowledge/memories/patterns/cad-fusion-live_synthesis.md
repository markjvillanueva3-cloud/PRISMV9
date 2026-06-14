---
name: cad-fusion-live_synthesis
description: "[auto-synth · verify] Compounding synthesis of the cad-fusion-live domain — recurring patterns, decisions, open threads distilled from 21 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: cad-fusion-live
  synthesizedFrom: 21
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T01:46:04.610Z
  sourceHash: e7248dcbe868
  advisoryOnly: true
  mustHumanVerify: true
---

# cad-fusion-live — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 21 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Delta‑driven asset generation** – New high‑ROI CAD assets are produced by mining all prior sessions and wiring them into a unified “delta” ([reference_delta_cad_asset_generation_2026_05_29]).
- **Galaxy file locality** – Per‑galaxy engine files (`CLAUDE.md`, `MEMORY.md`) reside on the shared `cad-fusion-live-ms0` tree, not on individual slot worktrees ([feedback_foxtrot_galaxy_recover_not_rebuild]; [reference_tango_stale_slot_worktree_2026_05_29]).
- **Stale slot worktrees** – Slot branches frequently lag the main integration by hundreds to thousands of commits, causing “could not resolve” build errors that must be self‑merged rather than rebuilt ([feedback_stale_slot_build_break_escalate_resync]; [reference_tango_stale_slot_worktree_2026_05_29]).
- **Verification against MAIN** – All asset checks, missing‑engine detection, and hallucination guards are performed against the canonical `H:/prism` tree, not a stale checkout ([reference_bravo_verify_against_main_not_worktree_2026_05_29]; [reference_reference_main_tree_untracked_work_2026_05_30]).
- **Compounding synthesis** – Each galaxy’s memories are distilled into a `patterns/<galaxy>_synthesis.md` file; these syntheses feed both the Obsidian brain and LoRA training pipelines ([reference_alpha_b1_galaxy_reflection_2026_05_29]; [reference_lora_galaxy_synthesis_feeder_2026_06_10]).
- **Bridge‑wiring of engines** – Repeated “bridge‑wiring” sessions connect newly built engines into the central orchestrator (`prism_orchestrate`, `prism_shop`) ([reference_mike_bridge_wiring_session_2026_05_23]).
- **Task freshness gating** – Pre‑tool‑use gates enforce strict lesson compliance before a task can proceed, e.g., `TASK‑FRESHNESS‑GATE‑MS0` ([reference_task_freshness_gate_ms0_2026_05_18]).

## Key decisions & rules
- **Check all prior sessions before delta generation** – Operator directive to aggregate historic knowledge for every new CAD asset ([reference_delta_cad_asset_generation_2026_05_29]).
- **Never blind‑rebuild galaxy files** – Recover from `cad-fusion-live-ms0` instead of recreating; duplicate builds are prohibited ([feedback_foxtrot_galaxy_recover_not_rebuild]; [feedback_stale_slot_build_break_escalate_resync]).
- **Self‑merge lagging slots** – When a slot worktree is behind, the developer must merge their own galaxy changes up to `cad-fusion-live-ms0` rather than triggering a full rebuild ([feedback_stale_slot_build_break_escalate_resync]).
- **Validate against MAIN tree** – Asset verification, missing‑engine detection, and hallucination checks must reference the canonical main tree (`H:/prism`) only ([reference_bravo_verify_against_main_not_worktree_2026_05_29]).
- **Compounding pattern completeness** – All 34 galaxies must contain a fully populated `MEMORY.md` with the four‑section brain structure; reviewers must flag inflation or self‑defeating tests ([reference_galaxy_memory_fill_2026_06_08]).
- **Go‑live branch reconciliation** – Before slot go‑live, confirm that slot commits are not already superseded on `cad-fusion-live-ms0`; abort if overlap is detected ([reference_ollama_golive_reconcile_2026_06_09]).
- **LoRA dataset mode** – Use the `--source galaxy` flag to pull 512 advisory‑tagged Alpaca pairs per galaxy for training ([reference_lora_galaxy_synthesis_feeder_2026_06_10]).
- **Cascade defaults retirement** – The two‑pass cascade actions must be switched off the retired Qwen2.5 model; otherwise they default to an unavailable GPU roster ([reference_cascade_defaults_retired_model_2026_06_09]).
- **High‑ROI skill synergy fix** – Apply env‑var gating and P0 scrutiny for `U‑SKILL‑LEDGER‑REVIVE‑FIX1` commits on slot kilo ([reference_post_ship_high-roi-skill-synergy-u-skill-ledger-revive-fix1]).

## Open threads
- **Integration backlog resolution** – Slot/tango remains ~1900 commits behind `cad-fusion-live-ms0`; a systematic rebase or merge plan is needed ([reference_tango_stale_slot_worktree_2026_05_29]).
- **Untracked file explosion** – The main tree holds ~34 200 untracked files, many of which are real content; cleanup strategy and tracking policy remain undefined ([reference_main_tree_untracked_work_2026_05_30]).
- **Galaxy MEMORY.md completeness audit** – While 34/34 galaxies have `MEMORY.md`, reviewers noted corpus inflation and a failing RED test; further validation criteria are pending ([reference_galaxy_memory_fill_2026_06_08]).
- **Cascade model migration** – After retiring Qwen2.5, the appropriate replacement cascade model has not been locked down; performance impact assessment is ongoing ([reference_cascade_defaults_retired_model_2026_06_09]).
- **Slot‑to‑MAIN verification tooling** – Current manual checks risk human error; an automated diff/verification pipeline between slot branches and `cad-fusion-live-ms0` is still under design ([reference_bravo_verify_against_main_not_worktree_2026_05_29]; [reference_ollama_golive_reconcile_2026_06_09]).
- **Compounding pattern standardization** – The exact schema for `<galaxy>_synthesis.md` and its downstream LoRA usage needs final specification to avoid future inconsistencies ([reference_alpha_b1_galaxy_reflection_2026_05_29]; [reference_lora_galaxy_synthesis_feeder_2026_06_10]).
