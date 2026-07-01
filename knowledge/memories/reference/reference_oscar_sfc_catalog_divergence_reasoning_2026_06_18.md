---
name: reference_oscar_sfc_catalog_divergence_reasoning_2026_06_18
description: "SFC closed-loop now AI-reasons over vendor divergences (Ollama + local-panel octopus + Obsidian brain), wired into the daily cron"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.696Z
aliases: reference_oscar_sfc_catalog_divergence_reasoning_2026_06_18
---


SFC closed-loop now **reasons over the vendor divergences** it produces, autonomously (2026-06-18, slot:oscar). Closes the gap where catalog-compare emitted real PRISM-vs-OEM divergences (8 brands) that NOTHING reasoned over — the existing triage reads the sweep's divergence-rows (0; the tool-agnostic sweep abstains `uncited`).

**New stage:** `mcp-server/scripts/sfc-catalog-divergence-reason.mjs` (commits `0e06327c67` + `<prior>`), wired as **cron stage 4b** in `sfc-closed-loop-cron.mjs` (after catalog-compare, gated on its success). Uses all 4 substrates the operator named:
- **Ollama** — `qwen3-coder:30b` reasons each significant divergent regime (|bias_vc%|>=20, n_cited>=5) -> `{category, root_cause, base_model_improvement, confidence}`, verified-JSON with a deterministic rule-based fallback (R12: source recorded per regime, never fabricated; `validReason` rejects out-of-enum).
- **Octopus** — `octopusConsensus`: DEFAULT is a LOCAL multi-model panel (`qwen3-coder:30b + gpt-oss:20b + deepseek-r1:32b`) voting on the single highest-stakes regime (PRISM-HIGH on heat-sensitive ISO M/S = over-speed risk); agreement on the modal category = confidence (accept>=0.66/review>=0.5). The full cross-vendor `MultiModelConsensusEngine` is an INJECTABLE path (`opts.engine`) — it returned 0 voices headless, so the robust default is local-only (zero external spend). Fail-soft.
- **Obsidian** — persists a derived brief to `H:/prism/knowledge/memories/patterns/sfc-catalog-divergence-reasoning.md` (the brain).
- **Hermes** — the brain + `galaxy-reasoning-bridge` recall the accumulated improvement candidates next session.

ADVISORY: emits improvement candidates only, never auto-edits a cut-data table / softens a threshold (oscar soul rails). Over-speed risk is a HARD ranking tier.

**Two bugs fixed during validation (R12 — the AI was a NO-OP before):** (1) `callOllama` resolves `{ok, text}` NOT `{response}` — reading the wrong field gave ollama 0/7 (all deterministic). Read `.text` only (the dead `.response` fallback removed; a test now FAILS under a `.response` regression — arm-B P1). (2) `gpt-oss:120b` is a slow reasoning/harmony model that rarely emits clean JSON in budget -> default to `qwen3-coder:30b` (clean JSON, ~20s).

**LIVE proof:** standalone + full-cron both: **ollama 7/7 regimes reasoned, octopus 2-voice local consensus (verdict accept), brain persisted**; cron stage `catalog-reason (126s) OK`. 23/23 tests; 3-of-3 PASS. The `PRISM SFC Closed Loop` daily task (enabled 2026-06-17) now runs this every day.

**CONTINUOUS (2026-06-18, U-OSC-CLOSED-LOOP-CONTINUOUS):** the `PRISM SFC Closed Loop` task was DAILY -> now **every 15 min + AtStartup** (`install-sfc-closed-loop-task.ps1`, IgnoreNew) so a physics-model regression (any slot) is caught within minutes for launch, not a day. The GPU-heavy catalog-reason has a **skip-if-fresh** guard: a sha256 fingerprint of the selected regimes' id+vc+fz+containment+citations is stamped in `divergence-reasoning.json`; an unchanged fingerprint skips the Ollama+octopus re-reasoning (catalog-compare is deterministic), so continuous ticks don't re-burn the GPU (shared with india LoRA) on static data. A bias shift -> new fingerprint -> re-reason within one tick. `--force`/`PRISM_SFC_REASON_FORCE` overrides. The CPU aggregate + rollup follow-up is now DONE -> [[reference_oscar_sfc_closed_loop_cpu_skip_2026_06_18]] (U-OSC-CLOSED-LOOP-CPU-SKIP: both heavy reducer stages are skip-if-fresh too, so a continuous idle tick is fully cheap).

Tuning knobs: `PRISM_SFC_REASON_{MODEL,NO_OLLAMA,NO_OCTOPUS,BRAIN_DIR,FORCE}`, `PRISM_SFC_OCTOPUS_MODELS`. See [[reference_oscar_sfc_autonomous_closed_loop_started_2026_06_17]] · [[reference_oscar_sfc_per_machine_core_complete_2026_06_17]].
