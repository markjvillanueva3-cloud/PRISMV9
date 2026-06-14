---
name: reference-rgs-tool-autoinvoke-ms0
description: RGS-TOOL-AUTOINVOKE-MS0 — per-roadmap-unit toolchain enrichment + outcome feedback loop
aliases: reference_rgs_tool_autoinvoke_ms0_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.916Z
---


# RGS-TOOL-AUTOINVOKE-MS0

Shipped 2026-05-16. Attaches a self-correcting toolchain to every open roadmap unit (4,404 units), surfaced at `/pick-unit` / `/rgs` pickup, with a Stop-hook outcome feedback loop re-ranking suggestions over time.

## Design decisions (from 10-agent pre-build scrutiny)

1. **Compose-not-rebuild**: the only net-new artifact is the rule table (`scripts/lib/rgs-pipeline-rules.mjs`). All signal sources delegate to existing engines:
   - Capability search → `prismSelfAwarenessEngine.findCapabilities()`
   - Skill triggering → `_skill-triggers.jsonl` (built by `extract-skill-triggers.mjs`)
   - Graph traversal → `scripts/lib/system-viz-graph.mjs` (mtime cache; 4.3h→3.4s)
   - Tribal → `tribal-embed-index.json`
   - Synthesis → Ollama `qwen2.5-coder:7b`

2. **Fold into pick-prefresh-inject** (not a new hook): pick-prefresh-inject already fires at the exact pickup moment. U-SURFACE extended it in-place — zero new hook wiring.

3. **Graph-load-once**: U-VIZLIB ships `scripts/lib/system-viz-graph.mjs` with mtime-keyed cache. All consumers (planner, fusion, surface) share one warm load per process lifetime.

4. **Feedback loop promoted to MS0**: outcome loop (`rgs-plan-outcome.mjs` + `rgs-outcome-record-stop.mjs` Stop hook) was originally slated for MS1 but scrutiny found the system would plateau without it. Shipped in MS0 as U-OUTCOME.

## Key files

| File | Role |
|------|------|
| `scripts/lib/system-viz-graph.mjs` | Load-once graph lib (mtime cache) |
| `scripts/lib/rgs-unit-enum.mjs` | Open-unit enumerator |
| `scripts/lib/rgs-pipeline-rules.mjs` | Keyword→pipeline+agent rule table (net-new) |
| `scripts/lib/rgs-signal-fusion.mjs` | Pure fuser + Beta re-rank |
| `scripts/rgs-tool-planner.mjs` | Batch orchestrator + JSONL checkpoint |
| `scripts/lib/rgs-plan-outcome.mjs` | Outcome extractor |
| `.claude/hooks/rgs-outcome-record-stop.mjs` | Stop hook — outcome recorder (wired both settings.json) |
| `pick-prefresh-inject.mjs` | Extended surface point (no new hook) |
| `scripts/rgs-plan-coverage.mjs` | Anti-rot %-fresh dashboard |

## Sidecar

`state/shared/roadmap-tool-plans.json` — plans + outcomes keyed by unit_id. Written atomically by planner. Read by pick-prefresh-inject at pickup. Outcome log appended by Stop hook.

## Knobs

- `PRISM_RGS_TOOL_PLAN_INJECT=0` — disable pick-prefresh surfacing
- `PRISM_RGS_OUTCOME_RECORD_DISABLE=1` — disable outcome recording
- `PRISM_RGS_PLANNER_BATCH_SIZE=N` — batch size (default 50)
- `PRISM_RGS_PLAN_STALE_DAYS=N` — stale threshold for coverage metric (default 7)

## Anti-rot metric

`/rgs tool-plan-coverage` or `node scripts/rgs-plan-coverage.mjs`. Healthy: `fresh_pct >= 80`.

## Settings.json wiring

`rgs-outcome-record-stop.mjs` wired in Stop chain — verified 1/1 in both C: and H: settings.json (2026-05-16).

## Related

- [[reference_ollama_pipeline_ms0_2026_05_15]] — Ollama pipeline this delegates synthesis to
- [[feedback_system_viz_first_audit]] — graph-load-once doctrine behind U-VIZLIB
