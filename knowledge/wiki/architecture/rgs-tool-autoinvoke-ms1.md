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

## U-CRON (shipped — commit `025d5c248`)

Nightly cron replan so the tool-plan sidecar never rots. `rgs-tool-planner.mjs`
gained `--time-budget <min>` — caps wall-clock runtime; the loop stops before
the next unit once the budget is spent, and per-unit checkpointing resumes the
next night. Wired the previously-dead `onFlush` callback so a long budgeted run
re-stamps its planner lock on every flush (it would otherwise age past the
10-min lock and be stolen). `install-rgs-planner-task.ps1` registers the nightly
Windows scheduled task (default 3:13 AM, `--time-budget 60`), modeled on
`install-fleet-reaper-task.ps1`. 4 new node:test suites (T8–T11); 92/92 green.

## U-DOMAIN-RULES (shipped — 2026-05-16)

Closes the punch-list's 42% generic-fallback gap. Adds five
manufacturing-domain rules to `scripts/lib/rgs-pipeline-rules.mjs` mapping unit
text to the canonical Tier-3 parent skills:

| Keyword pattern | Skill | Confidence |
|---|---|---|
| `\bmill(ing|-turn)?\b` | `/mill` | 0.80 |
| structural test (`\blathe\b` ∪ `\bmazak\s+lathe\b` ∪ `okuma+model` ∪ `turning+context`) | `/lathe` | 0.80 |
| `\bwedm\b|\bwire[-\s]*edm\b|\bsinker[-\s]*edm\b` | `/wedm` | 0.80 |
| `\bcam(?:ming)?\b|\btoolpath\b` | `/cam-strategy` | 0.75 |
| `\bcad\b|\bblueprint\b|\bprint[-\s]*to[-\s]*program\b` | `/cad-from-blueprint` | 0.80 |

Also fixed in the same edit (scope-justified — all surface from the per-file
scrutiny on the rules table):

- **Wire-EDM false-match (punch-list P1)** — the original
  `/wire|dispatcher|unwired|orphan|wiring/i` rule fired `/wire-unwired` on every
  Wire-EDM unit. Tightened with a structural test fn that excludes wire-EDM
  context first, then requires `\bunwired\b|\borphan\b|\bdispatcher\b|\bwiring\b`.
  The same fix applied to the `AGENT_RULES` wiring-review-agent (Arm A P3-2 —
  exact same bug class three rules above, surfaced by reviewer).
- **`/lathe` polysemy guard (Arm A P0-1)** — bare `turning` matched "a turning
  point in the project"; bare `okuma` matched "Okuma operator manual" but Okuma
  also builds HMCs/VMCs/grinders. Replaced with a structural test that requires
  `okuma` to pair with a lathe-model token (LT/LB/MULTUS/SimulTurn/...) and
  `turning` to pair with a manufacturing-context noun.
- **Deep-freeze contract (Arm A P0-2)** — file-header docstring promised
  "mutation throws in strict mode" but `Object.freeze` is shallow; the inner
  rule objects mutated silently. Added a `deepFreezeArray()` helper that freezes
  each entry; the docstring contract now actually holds. Two regression-guard
  assertions in the test file (`assert.throws(...)` on `.confidence = 999`).
- **`/cad-from-blueprint` `\bdrawing\b` drop (Arm A P1-2 / Arm B P2)** — too
  broad ("drawing conclusions from data", "drawing power from the spindle").
  The remaining tokens cover the real CAD-intake surface.

**Skill-trigger registration (envelope's second deliverable)** — added
canonical `triggers:` YAML frontmatter blocks (event/matcher.type/matcher.value/
score/action — mirroring `/lathe-studio`'s shape) to the 5 parent skills:
`mill.md`, `lathe.md`, `wedm.md`, `cam-strategy.md`, `cad-from-blueprint.md`.
The `_skill-triggers.jsonl` regen via `scripts/extract-skill-triggers.mjs`
picks them up automatically (33 unique skills → 36 entries after regen; 5 new
domain entries verified present).

End-to-end command bridge live-verified via 3 smoke tests of the
`skill-auto-trigger.mjs` hook with representative domain prompts — `/mill`,
`/wedm`, and `/cad-from-blueprint` each surface correctly via
`hookSpecificOutput.additionalContext`.

**Tests:** `scripts/lib/rgs-pipeline-rules.test.mjs` grew from 22 → 31 cases
(+13 = 5 domain positives + 2 polysemy guards + 2 freeze-contract guards +
1 mill-turn composite + 1 milligrams edge + 2 agent-rule contrapositives + 1
Okuma-LB-model positive). All 31 GREEN.

**Per-file scrutiny:** Arm A (code-analyzer) returned FAIL with 2 P0 + 2 P1;
Arm B (independent reviewer) returned PASS WITH P1. All Arm A P0/P1 addressed
in the same edit. Arm B's P1 (`mean()` → `max()` aggregator in
`scripts/lib/rgs-signal-fusion.mjs:194`) is a pre-existing downstream bug this
edit aggravates (more multi-match → more confidence dilution) — deferred to a
follow-up unit; the `DETERMINISTIC_CONF_CAP=0.6` absorbs most of the loss until
then.

## P1 backlog (validated by the audit, not yet built)

`U-DOMAIN-RULES` (mill/lathe/wedm/cam/cad pipeline
rules + domain skill triggers) · `U-DISPATCHER` (`prism_dev:roadmap_tool_plan_*`)
· `U-FEEDBACK-FORCING` (pickup composite-key fallback) · `U-RIE-ADAPTER`
(RoadmapIntelligenceEngine complexity adapter) · `U-CALIBRATION`
(CAMConfidenceCalibrationEngine at ≥50 outcomes) · `U-TRANSFER`
(cross-milestone transfer priors).

Full detail: `docs/superpowers/specs/2026-05-16-rgs-tool-autoinvoke-MS1-punchlist.md`.
