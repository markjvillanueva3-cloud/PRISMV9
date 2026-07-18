---
name: reference_ollama_stress_batteries_6_2026_06_24
description: "6 new verified Ollama capability stress-test batteries (codegen/reasoning/longcontext/json/instruction/mfgdomain) -- built+verified, clean live matrix pending a quiet Ollama window"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.682Z
aliases: reference_ollama_stress_batteries_6_2026_06_24
---


**U-ALPHA-OLLAMA-BATTERIES-6** (slot:alpha, 2026-06-24, commit `135fdb5a2e`). Extends the Ollama capability stress harness beyond the original short-mechanical battery to 6 new dimensions.

**Built + verified (via the `ollama-capability-stress-expansion` Workflow -- 6 sonnet authors + 6 sonnet adversarial reviewers, then self-test-validated):**
- `scripts/lib/stress-battery-codegen.mjs` -- pure-JS function gen, vm-SANDBOXED exec verify (NO require/process/fs + 1000ms timeout + throw->false). SELFTEST 36/36 (review FIXED an initial 4/36).
- `scripts/lib/stress-battery-reasoning.mjs` -- deterministic multi-step logic/word problems (27/27).
- `scripts/lib/stress-battery-longcontext.mjs` -- needle-in-haystack at 2K/8K/16K filler (117/117); empirically exercises the byte-based num_ctx fix.
- `scripts/lib/stress-battery-jsonschema.mjs` -- structured-JSON adherence + schema/type check (12/12).
- `scripts/lib/stress-battery-instruction.mjs` -- hard mechanical output constraints (32/32).
- `scripts/lib/stress-battery-mfgdomain.mjs` -- G-code/ISO-insert/tolerance/threading facts, exact-match (48/48).
- `scripts/ollama-stress-expanded-run.mjs` -- GPU-safe executor (model-outer, num_ctx auto-sized, dynamic battery import).

All india-TASK_BATTERY-shaped `{id,category,cases,prompt,verify}`; verifiers PURE+SAFE and FAIL on wrong answers (R9, proven by self-tests + adversarial review). Consumed directly by `runTierSweep` (the `tasks` param).

**LIVE-MATRIX STATUS -- PENDING (R12 honest):** the harness + verifiers PROVABLY work (demonstrated live: a reasoning task -> "Carol" -> verify true). BUT a CLEAN full capability matrix could NOT be captured this session -- Ollama flaked repeatedly under concurrent 3-peer fleet load + the fleet-reaper killed long runs mid-execution (contaminated sweeps returned all-0% / empty stdout when callOllama failed mid-run). This is an ENVIRONMENT limitation, not a defect in the batteries.

**NEXT STEP (quiet Ollama window):** `node scripts/ollama-stress-expanded-run.mjs --include-codegen --num-predict 512` for the 7b workhorse, then per-model for deeper coverage (deepseek-r1:14b for reasoning; gpt-oss:20b solo). Run when fleet load is low (check `ollama-wedge-guard.mjs` healthy first). This yields the smallest-model-per-task-CLASS routing answer that closes the "mechanical-only" caveat on [[reference_ollama_stress_capability_2026_06_24]]. Builds on the byte-num_ctx fix (commit 4ec7e7c1e3).
