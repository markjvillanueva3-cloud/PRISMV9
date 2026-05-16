---
title: RGS-TOOL-AUTOINVOKE-MS0 — Per-roadmap-unit toolchain enrichment + outcome feedback loop
slug: rgs-tool-autoinvoke-ms0
kind: architecture
domain: ai-routing
status: shipped
shipped_at: 2026-05-16
shipped_by: claude-02436db5 (slot T10)
commits:
  - 04ccd9556  # U-SPEC
  - 18257886d  # U-PLAN
  - "023964759"  # U-VIZLIB
  - 7b1ede136  # U-OLLAMAFMT
  - "188397949"  # U-ENUM
  - b2cec23d1  # U-RULES
  - 8b3ca72c3  # U-FUSION
  - 444ecb44b  # U-PLANNER
  - 9052c6eb1  # U-OUTCOME
  - d967c701e  # U-SURFACE
  - 0c2274f9d  # U-COVERAGE
milestone: RGS-TOOL-AUTOINVOKE-MS0
related:
  - ollama-pipeline-ms0
  - system-viz-first-audit
  - master-index-surface
  - awareness-stack
---

# RGS-TOOL-AUTOINVOKE-MS0

Attach a self-correcting PRISM toolchain (dev pipeline + tribal + skills + MCP tools + review agents) to every open roadmap unit, surfaced at pickup time, learning from shipped/blocked outcomes. Operator-gated, suggest-only.

## Problem

Every `/pick-unit` or `/rgs` invocation surfaced a roadmap unit to work on — but gave no guidance on WHICH tools, pipelines, review agents, or MCP actions were most relevant. Operators re-derived this from scratch every session. Shipped/blocked outcomes were never fedback into future suggestions. The 4,404 open roadmap units had zero toolchain pre-population.

## Architecture

```
Signal sources (deterministic)
  ├── findCapabilities()           ← PRISMSelfAwarenessEngine — engine/action matches
  ├── skill-triggers.jsonl         ← extract-skill-triggers.mjs — keyword→skill table
  ├── system-viz-graph (via lib)   ← scripts/lib/system-viz-graph.mjs — graph traversal
  └── tribal-embed-index.json      ← domain-keyed tribal hits

          ↓  scripts/lib/rgs-signal-fusion.mjs
          ↓  (pure fuser, minimum-plan contract, Beta re-rank)
          ↓
     sidecar: state/shared/roadmap-tool-plans.json
          ↓
     pick-prefresh-inject.mjs      ← UserPromptSubmit — surfaces at /pick-unit / /rgs
          ↓
     Operator decides, executes, ships or blocks
          ↓
     rgs-outcome-record-stop.mjs   ← Stop hook — records outcome → re-rank next time
```

### Delegation principle

**Only net-new artifact is the rule table** (`scripts/lib/rgs-pipeline-rules.mjs`). Every other signal is delegated:
- Capability search → `prismSelfAwarenessEngine.findCapabilities()`
- Skill triggering → `knowledge/wiki/architecture/_skill-triggers.jsonl` (built by `extract-skill-triggers.mjs`)
- Graph traversal → `scripts/lib/system-viz-graph.mjs` (`loadGraph`/`findInGraph`, load-once mtime cache, 4.3h→3.4s)
- Tribal → `state/shared/tribal-embed-index.json` keyed by domain
- Synthesis → Ollama `qwen2.5-coder:7b` (optional, degrades gracefully to deterministic-only)

This compose-not-rebuild pattern was the primary finding from the 10-agent pre-build scrutiny review.

## Unit table

| Unit | Title | SHA |
|------|-------|-----|
| U-SPEC | Hardened design spec + allowlist unblock | `04ccd9556` |
| U-PLAN | 10-task TDD implementation plan | `18257886d` |
| U-VIZLIB | `scripts/lib/system-viz-graph.mjs` — loadGraph/findInGraph, load-once cache | `023964759` |
| U-OLLAMAFMT | `ollama-hook-bridge.mjs` additive `format` passthrough | `7b1ede136` |
| U-ENUM | `scripts/lib/rgs-unit-enum.mjs` — open-unit enumerator (4404 open units) | `188397949` |
| U-RULES | `scripts/lib/rgs-pipeline-rules.mjs` — keyword→pipeline+agent rule table | `b2cec23d1` |
| U-FUSION | `scripts/lib/rgs-signal-fusion.mjs` — pure fuser, minimum-plan contract, Beta re-rank | `8b3ca72c3` |
| U-PLANNER | `scripts/rgs-tool-planner.mjs` — detached orchestrator, JSONL checkpoint, atomic flush | `444ecb44b` |
| U-OUTCOME | `scripts/lib/rgs-plan-outcome.mjs` + `.claude/hooks/rgs-outcome-record-stop.mjs` | `9052c6eb1` |
| U-SURFACE | `pick-prefresh-inject.mjs` extended — tool-plan surfacing, no new hook | `d967c701e` |
| U-COVERAGE | `scripts/rgs-plan-coverage.mjs` — anti-rot %-fresh dashboard + `/rgs tool-plan` op | `0c2274f9d` |
| U-DOCS | 5-surface doc reflection + milestone envelope | *(this commit)* |

## Key artifacts

### `scripts/lib/system-viz-graph.mjs` (U-VIZLIB)

Load-once graph helper with mtime-keyed cache. Converts the 4.3h cold-load of `system-graph.json` to 3.4s on re-use across planner batch runs. Exports `loadGraph(path?)` and `findInGraph(graph, query, k?)`.

### `scripts/lib/rgs-pipeline-rules.mjs` (U-RULES)

The sole net-new knowledge artifact. Maps unit keywords → recommended pipelines + agent roles:

```js
// Example rule shape
{ keywords: ["engine", "physics"],  pipelines: ["/forge-triple", "/scrutinize"],
  agents: ["physics-reviewer", "test-review-agent"], tier: "build" }
```

~30 keyword clusters covering: build, test, dispatcher, hook, schema, CAD, CAM, WEDM, lathe, mill, post, quote, ERP, memory, UI, docs.

### `scripts/rgs-tool-planner.mjs` (U-PLANNER)

Detached batch orchestrator. Reads open units from `rgs-unit-enum.mjs`, runs signal fusion per unit, writes plans as JSONL checkpoints (atomic flush), locks `state/shared/.rgs-planner.lock` to prevent concurrent runs. Flags graph-load-once for perf. Resumes from checkpoint after interruption.

### `scripts/lib/rgs-plan-outcome.mjs` + `rgs-outcome-record-stop.mjs` (U-OUTCOME)

Feedback loop. Stop hook extracts whether the session resulted in a ship/block/abandon for the active roadmap unit and appends to `state/shared/roadmap-tool-plans.json` outcome log. Signal-fusion reads prior outcomes → Beta distribution re-rank (higher weight to tools that co-occurred with successful ships).

### `scripts/rgs-plan-coverage.mjs` (U-COVERAGE)

Anti-rot dashboard. Reports what % of open units have a fresh tool-plan (age < threshold). Wired as `/rgs tool-plan-coverage` op. Healthy target: >80% of open units with plans <7 days old.

## Safety properties

- **Suggest-only** — no tool is auto-executed. Every recommendation requires operator confirmation.
- **Operator-gated** — plans surface at `/pick-unit` / `/rgs` pickup; never injected mid-task.
- **Deterministic fallback** — if Ollama is down, signal fusion runs deterministic-only (rule table + capability search + skill triggers) and returns a valid plan without LLM synthesis.
- **Graceful degradation** — missing graph, missing tribal index, missing Ollama: each degrades independently; partial signal sets still produce useful plans.
- **No auto-execution** — `rgs-outcome-record-stop.mjs` records outcomes passively; it never launches tools.

## Knobs

| Variable | Default | Effect |
|----------|---------|--------|
| `PRISM_RGS_TOOL_PLAN_INJECT` | `1` (enabled) | Surface tool-plans in pick-prefresh-inject |
| `PRISM_RGS_OUTCOME_RECORD_DISABLE` | `0` (enabled) | Set `=1` to disable outcome recording Stop hook |
| `PRISM_RGS_PLANNER_BATCH_SIZE` | `50` | Units per planner batch run |
| `PRISM_RGS_PLAN_STALE_DAYS` | `7` | Days before a plan is considered stale for coverage metric |

## Anti-rot metric

```bash
node H:/prism/scripts/rgs-plan-coverage.mjs           # text summary
node H:/prism/scripts/rgs-plan-coverage.mjs --json    # machine-readable
# or via /rgs skill:
/rgs tool-plan-coverage
```

Healthy: `fresh_pct >= 80`. Stale plans = planner hasn't run recently or unit count grew faster than plans were generated. Remediation: `node scripts/rgs-tool-planner.mjs --batch`.

## Pre-build scrutiny (10-agent review)

Ten parallel Claude review agents reviewed the design spec (U-SPEC) before any code was written. Key findings encoded in the architecture:

1. **Compose, don't rebuild** — initial design had a custom capability-search; agents flagged `findCapabilities()` already exists. Removed.
2. **Fold into pick-prefresh-inject** — initial design proposed a new hook for surfacing. Agents found pick-prefresh-inject already fires at exactly the right moment. No new hook needed (U-SURFACE).
3. **Graph-load-once** — naive design re-loaded `system-graph.json` per unit. Agents flagged 4.3h load time. U-VIZLIB ships the mtime-cached lib used by all consumers.
4. **Feedback loop in MS0** — agents flagged that without outcome learning, the tool recommendations would stay static. Outcome loop promoted from "nice-to-have MS1" to MS0 must-ship (U-OUTCOME).

## Related

- [[ollama-pipeline-ms0]] — Ollama pipeline wiring this system delegates synthesis to
- [[system-viz-first-audit]] — graph-load-once lib built on the same graph traversal doctrine
- [[master-index-surface]] — complementary search-first discipline
- [[awareness-stack]] — pick-prefresh-inject is part of this stack
