---
title: RGS-TOOL-AUTOINVOKE-MS1
type: architecture
status: in_progress
created: 2026-05-16
tags: [rgs, roadmap, integration-fix, e2e-testing, ollama]
---

# RGS-TOOL-AUTOINVOKE-MS1 — Integration hardening + backlog

MS0 ([[rgs-tool-autoinvoke-ms0]]) shipped the per-roadmap-unit tool-plan system
with 97 unit tests — all green. A 10-agent post-ship audit then found the
milestone was **architecturally sound but functionally broken**: 10 P0
integration bugs, every one in the orchestrator's *real* reader factories.

## The core lesson

The 97 MS0 unit tests passed because they injected **fake** readers
(`makeReaders()` in `rgs-tool-planner.test.mjs` returns stub objects). Every P0
lived in the *real* factories — `makeTribalReader`, `makeCapabilitiesReader`,
`makeOllamaReader`, `makeOutcomesReader` — and the hook↔sidecar schema seam,
none of which a fake-reader test can reach.

> **A "pure core + injected readers" design MUST also ship one real-data E2E
> test.** Hermetic unit tests with injected fakes do not prove the production
> wiring works.

## U-INTEG-FIX-P0 (shipped — commit `b287c1614`)

`scripts/rgs-tool-planner.e2e.test.mjs` — the real-data regression oracle.
Exercises the real reader factories against the committed tribal index, the
frozen pipeline rules, real-schema feedback records, and (resource-gated) a
live Ollama daemon. **11 failing assertions on the buggy code → 84/84 green**
after the fixes.

| P0 | Bug | Fix |
|----|-----|-----|
| 1 | tribal reader `.map()`'d the `{tokens,hits}` object → swallowed TypeError → `tribal:[]` | destructure `{hits}`; map `h.title` |
| 2 | ollama bridge default `localhost` → Node IPv6 `::1` → ECONNREFUSED | default `127.0.0.1` |
| 3 | ollama reader used bridge default 500ms timeout vs 2.5-4.3s qwen-7b | pass `timeoutMs: 30000` |
| 4 | capabilities reader passed whole unit text to a substring matcher → 0 hits | tokenize, query per token, union |
| 5 | `/forge-triple` fired on ~98.6% of units (matched header boilerplate) | drop the literal-phrase trigger |
| 6a | `pick-prefresh-inject` guarded `entry.plan` but sidecar is flat → 0 picked events | read the flat ToolPlan |
| 6b | composite `MS::U-id` key never split → shipped units misclassified `blocked` | split on `::` |
| 6c | outcome record had no `tier`/`verdict`; reader filtered on non-existent fields | carry tier+verdict end-to-end; aggregate by `outcome` |
| 7 | coverage read `entry.plan.source` on a flat sidecar → `bySource` always `unknown` | read `entry.source` |
| 8 | `/rgs tool-plan` + `tool-plan-coverage` were menu entries with no `## Route:` handler | add both handlers |
| 10 | stop-hook git `spawnSync` timeout 8000ms > 3000ms harness timeout → orphaned child | `GIT_SPAWN_TIMEOUT_MS = 2500` |

The 6 reader factories in `rgs-tool-planner.mjs` are now `export`ed so the E2E
test can exercise the real wiring.

## P1 backlog (validated by the audit, not yet built)

`U-CRON` (nightly replan) · `U-DOMAIN-RULES` (mill/lathe/wedm/cam/cad pipeline
rules + domain skill triggers) · `U-DISPATCHER` (`prism_dev:roadmap_tool_plan_*`)
· `U-FEEDBACK-FORCING` (pickup composite-key fallback) · `U-RIE-ADAPTER`
(RoadmapIntelligenceEngine complexity adapter) · `U-CALIBRATION`
(CAMConfidenceCalibrationEngine at ≥50 outcomes) · `U-TRANSFER`
(cross-milestone transfer priors).

Full detail: `docs/superpowers/specs/2026-05-16-rgs-tool-autoinvoke-MS1-punchlist.md`.
