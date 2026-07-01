---
name: reference_backend-helper_phase3_pgo_determinism_2026_06_13
description: "Backend-helper (papa) Phase-3 deeper anchor — Hermes-planned (hype tempered, R12). (1) Profile-guided incremental build: esbuild+tsc incremental + a build-profile cache (which modules change/rebuild) to cut MCP/scheduled-task cold-start — realistic target = faster warm rebuilds, NOT the '<1ms' Hermes claimed. (2) Deterministic scheduled-task execution via compile-time EFFECT analysis (mark pure vs IO-effecting handlers) + V8-isolate-per-task isolation so a task's side effects can't bleed. Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.476Z
aliases: reference_backend-helper_phase3_pgo_determinism_2026_06_13
---


**Context:** Phase-3 backend-helper anchor — **Hermes-planned**, hype tempered. Deepens
[[reference_backend-helper_tooling_v8_mcp_2026_06_13]] (Phase-2). Spec §papa. R12: Hermes proposed "<1ms cold
start" + "replace the Node event loop" — those are aspirational/unrealistic; the honest, valuable increments:

## Realistic deeper increments
- **Profile-guided incremental build:** the build already does tsc-incremental + esbuild. Add a build-profile
  cache keyed on changed-module → dependency-closure so only the truly-affected graph recompiles, and warm the
  V8 compile cache. Measurable goal: faster warm rebuilds + lower MCP/scheduled-task startup — verified by
  timing, not a fabricated "<1ms".
- **Deterministic scheduled-task execution via effect analysis:** statically classify each handler's effects
  (pure vs filesystem vs network vs spawn) — a TS-Compiler-API/ts-morph pass — so scheduled tasks declare their
  side-effect surface; run effect-heavy tasks in a V8 isolate / child with bounded resources so one task can't
  starve others (relevant after THIS session's bash fork-bomb — bounded spawn surface). This is the realistic
  read of Hermes's "V8-isolate scheduler", not a Node-event-loop replacement.
- **The recurring failure-class playbook** (the highest real ROI): codify the V8 512MiB string-cap + heap-reexec
  + buffer/shard recipes ([[reference_tribal_index_v8_string_cap_2026_06_08]]) into a backend-helper engine that
  other slots query before touching large-file IO.

## Wiring / consumers (R15)
- GALAXY: `engines/backend-helper/` (papa). Serves EVERY galaxy (build/infra). DOMAIN: fleet-wide infra.
- AUTO-INVOCATION: a pre-build profile check; an effect-lint on new scheduled-task scripts.

## Next (Phase-4, per Hermes — papa's build, honestly scoped)
Build the effect-classifier (ts-morph) + the large-file-IO playbook engine; measure incremental-build deltas.
Do NOT chase the "<1ms"/"replace event loop" framing — unrealistic, not net-benefit.

Sources: TS Compiler API / ts-morph; V8 docs (compile cache, isolates); esbuild incremental; effect-system
literature. Planner: Hermes (xAI Grok, :8645) — claims tempered to verifiable scope per R12.
