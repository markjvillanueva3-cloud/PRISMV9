---
name: reference_fleet_reaper_ms1
description: FLEET-REAPER-MS1 Phase 2 — leftover-bash classifier + soft RAM relief + GPU/Ollama coordinator + alpha-slot guardian.
aliases: reference_fleet_reaper_ms1
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.576Z
---


FLEET-REAPER-MS1 (Phase 2, shipped 2026-05-14, strictly additive over [[reference_fleet_reaper]] MS0). 6 units. Commit map: units 1-5 (bash classifier, soft relief, GPU probe, Ollama coord, hint consumer) shipped in feature commit `f22a86d74`, reverse-merged into `cad-fusion-live-ms0` at `ac1b260ae`; unit 6 (alpha-slot guardian) + the doc-sync ship in a follow-on commit. Reframe: "kill more" → "use what's idle" — the box runs near commit-memory ceiling while the GPU sits idle.

- **U-PHASE2-BASH-CLASSIFIER** — `process-slot-map.mjs` `leftover-bash-task` class: bash/sh + structural cmd-pattern (AND-of-simple-regexes, 4096-char truncation, ReDoS-safe) + age ≥ 15min + UNPINNED `claude.exe` ancestor + resolved slot data. Catches the Bash-tool Monitor loop whose chat died but whose `claude.exe` lingered unpinned — the orphan MS0's dead-ancestor rule missed.
- **U-PHASE2-SOFT-RELIEF** (Layer 1) — reversible: BelowNormal priority + working-set trim (.NET `EmptyWorkingSet`) on stale-slot processes only, age floor 180s. Audit → `state/shared/.fleet-reaper-actions.jsonl` (dedicated, NOT the kills log).
- **U-PHASE2-GPU-PROBE** (Layer 2) — `readGpuState` (nvidia-smi CSV, fail-soft) + `readOllamaState` (`/api/tags`+`/api/ps`).
- **U-PHASE2-OLLAMA-COORD** (Layer 3) — `decideOllamaCoordination` (pure) + `prewarmOllama` (fire-and-forget) + `writeRoutingHint` (atomic, TTL'd, neutralizes stale aggressive hint). Advisory: a coordinator error never flips reap-mission `ok`.
- **U-PHASE2-HINT-CONSUMER** — `ollama-task-offloader.mjs` `loadRoutingHint` reads `state/shared/.ollama-routing-hint.json` (fixed absolute literal — cross-process contract), applies `thresholdDelta` clamped ±0.30. Contract wiki: `ollama-routing-hint.md`.
- **U-PHASE2-ALPHA-GUARDIAN** — `alpha-slot-reaper-guardian.mjs` (SessionStart + UserPromptSubmit, both `settings.json` chains, timeout 10000). Alpha chat owns the reaper — see [[feedback_alpha_owns_reaper]].

New flags `--no-coord` / `--no-relief`; 11 new env knobs (`PRISM_FLEET_REAPER_GPU_*` / `_HINT_*` / `_OLLAMA_*` / `_SOFT_RELIEF_*` + `OLLAMA_URL` reused) + `PRISM_ALPHA_GUARDIAN_{DISABLE,NO_SWEEP}`. Tests: `fleet-reaper.test.mjs` 66 → 137 cases.

**Known follow-ups (verify at close-out):** (1) vitest harness blocked by a pre-existing vite-transform bug in `process-slot-map.mjs` — code verified via `node --check` + esbuild + plain-import + a live `--once` production sweep, but the 137-case suite can't execute until the vite/es-module-lexer issue is found (sister clue: `chat-slots.mjs:622` documents the same vite-static-analyzer trap class). (2) `decideOllamaCoordination` reason said "below pressure floor" at 98.7% commit — may be gating on physical % not commit %; MS1 was framed around commit pressure. Both logged for the close-out audit.
