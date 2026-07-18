---
name: reference_cad_text_learn_loop_2026_06_24
description: U-CAD-TEXT-LEARN-LOOP (slot:india 2026-06-24) -- text->CAD Ollama bridge now feeds each evaluated generation into the CAD learning ledger; compounds with the tribal-injected recommendations. + 2 flags (cwd-relative ledger divergence; vitest suite fleet-unrunnable).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.498Z
aliases: reference_cad_text_learn_loop_2026_06_24
---


# U-CAD-TEXT-LEARN-LOOP -- close the text->CAD predictions->outcomes loop (2026-06-24, slot:india)

Second unit of the cron-driven CAD/print learning-AI loop (follows U-CAD-LEARN-TRIBAL-INJECT).
The Ollama text->CAD bridge `scripts/cad-text-to-cadquery.mjs` (zulu, U-CAD-TEXT-BRIDGE) staged
generations but NEVER fed their outcomes back -- an OPEN loop.

## What shipped (commit [MAIN-FORCE] [CAD-LEARNING-AI]/U-CAD-TEXT-LEARN-LOOP, cad-fusion-live-ms0)
3 new pure/fail-soft exports in the bridge:
- `classifyGenerationOutcome({invalidReason,status})` -> `{status:"pass"|"fail"|"error"} | null`.
  pass = executed + STEP analysis exit 0; fail = executed + bad STEP, OR a real run failure
  (executed:false WITHOUT evaluated:false); error = invalid/non-CAD LLM output.
  **null = NO signal** -- the env gap (cadquery/build123d not installed -> `evaluated:false`) is NOT
  a failure, so the ledger is never polluted with a false failure (R9/R12). main()'s env-missing
  branch now tags `evaluated:false`.
- `buildGenerationOutcomeRecord(request,model,cls)` -> a CADTrialErrorLearningEngine RegenerationOutcome
  (deterministic testId `cadtext-<slug>`; generator `cadquery-reasoning` for deepseek/r1 else
  `cadquery-text`; error truncated 300).
- `ingestGenerationOutcome(request,model,cls,importImpl?)` -> fail-soft ingest via the dist engine;
  null-skip; injectable importImpl (tested with a fake engine, no disk I/O).
Wired into main() at BOTH the invalid-code path and the post-execute path. Now generate -> outcome
-> ledger -> the cad_learning_* recommendations (tribal-injected) learn from it. The two units compound.

## Verification (R15)
- WIRE: ingestGenerationOutcome in main(), 2 call sites.
- TEST: 9/9 node:test (`node scripts/cad-text-to-cadquery.test.mjs`) -- classify pass/fail/error/env-skip-null,
  record mapping, ingest null-skip + real-ingest-via-fake-engine + fail-soft. Reviewer (code-analyzer) PASS.
- VALIDATE: executed->pass/fail INGEST path is pending a cadquery install (the same env gap the code
  handles -- so today live runs env-skip); the env-skip + invalid-code + ingest-wiring paths are test-proven.

## Flags (R12 -- found, not fixed)
1. **cwd-relative ledger divergence (latent engine issue):** `CADTrialErrorLearningEngine`'s
   `DEFAULT_LEDGER_PATH = resolve(process.cwd(), "data/state/cad-failure-ledger.jsonl")` is CWD-RELATIVE.
   A repo-root script (cwd=H:/prism) and the mcp-server dispatcher (cwd=mcp-server) would write
   DIFFERENT ledgers. This unit works around it by setting `PRISM_CAD_FAILURE_LEDGER` to the
   mcp-server canonical path before importing the engine. PROPER FIX (engine-side, owner india):
   make the default an absolute repo-anchored path (or resolve relative to the engine module dir),
   so every consumer shares one ledger without each setting the env.
2. **vitest suite fleet-unrunnable (2026-06-24):** a full `npx vitest run` crashes at CONFIG LOAD
   with MODULE_NOT_FOUND + an "Invalid file URL: must not contain hostname `file://${helper_path...}`"
   (a malformed file URL in a vitest setup helper). This blocks the `stop_on_failing_tests` freshness
   gate fleet-wide (report can't be refreshed). Pre-existing infra break amid 13645 uncommitted fleet
   files; not india-owned. node:test files (like this unit's) run fine via `node <file>` directly.

## Queue (continues [[reference_cad_print_learning_ai_goal_scope_2026_06_24]] + [[reference_cad_learn_tribal_inject_2026_06_24]])
Next: (3) blueprint LoRA/RAG train/eval-loop audit (blueprint_lora_*/blueprint_rag_*); replicate the
same outcome-loop + tribal-injection pattern there. Cron 87e3a5b3 (10-min) drives the loop.
