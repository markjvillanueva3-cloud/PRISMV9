---
type: "chat-session"
source: "claude-code-cli"
session_id: "fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27"
title: "Independent second-pass review of a wiring change to an existing Node ESM orches"
date: "2026-05-21"
first_ts: "2026-05-21T00:16:42.544Z"
last_ts: "2026-05-21T00:17:43.288Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27/subagents/agent-a1aa05b9de4b32ba5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Independent second-pass review of a wiring change to an existing Node ESM orches

> **claude-code-cli** | 2026-05-21 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27/subagents/agent-a1aa05b9de4b32ba5.jsonl`

## Transcript

### User | 2026-05-21T00:16:42.544Z

Independent second-pass review of a wiring change to an existing Node ESM orchestrator. Read the change and enough surrounding code to judge integration soundness. Weight toward integration coupling, ordering, and second-order effects a first reviewer might miss.

FILE: H:\prism\scripts\rgs-tool-planner.mjs
NEW DEPENDENCY: H:\prism\scripts\lib\rgs-calibration-adapter.mjs (just built, 30/30 tests pass, 2 reviewers PASS)

THE CHANGE (U-LIMA-A7): wires a confidence-calibration adapter into the planner. `runPlanner` gained an optional `calibrateConfidence?: (number)=>number` param; inside the per-unit loop, after `fuseSignals` returns a non-null `plan`, the planner does `if (typeof calibrateConfidence === "function" && unit.milestone) plan.confidence = calibrateConfidence(plan.confidence)` before storing the plan. The CLI `main()` builds it via `process.env.PRISM_RGS_CALIBRATION === "0" ? undefined : await makeCalibrationFn()` and passes it through. This mirrors the A6 pattern where `runPlanner` got a `complexityFor` fn built by the CLI from an async factory.

VERIFY THESE SECOND-ORDER CONCERNS:
- The plans sidecar this planner WRITES (`state/shared/roadmap-tool-plans.json`) is the SAME file the calibration adapter READS (to recover predicted confidences for the join). So calibration applied this run feeds calibration NEXT run. Is that a problem? The adapter joins outcome-ledger `unitKey`s against sidecar `confidence`. After this run, sidecar confidences are calibrated values. Next run, a NEW outcome for a unit would join against a now-calibrated confidence — calibrating a calibrated number. Is this a runaway feedback loop, or self-stabilizing, or a non-issue because the adapter `clearOutcomes()` + refeeds from scratch each run? Reason it through and state the verdict.
- `makeCalibrationFn()` reads the (multi-MB) sidecar at CLI init. The planner ALSO reads/writes that sidecar. Any read/write ordering or lock concern? (The planner has a lock file + atomic flush.) `makeCa
... [+992 chars truncated]

### Assistant | 2026-05-21T00:16:55.079Z

I'll review the actual files to judge the integration soundness.

### Assistant | 2026-05-21T00:16:55.349Z

[tool_use: Read]

### Assistant | 2026-05-21T00:16:55.560Z

[tool_use: Read]

### User | 2026-05-21T00:17:01.078Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\rgs-calibration-adapter.mjs' was already read 5m ago in this session and is unchanged (mtime 1779322111183). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-21T00:17:07.918Z

[tool_result] 1	/**
2	 * rgs-tool-planner.mjs
3	 * Batch orchestrator: builds a per-roadmap-unit tool-plan sidecar.
4	 *
5	 * Memory note: the system-viz graph is ~324 MB. Under portable-node's default
6	 * heap this is fine, but if you hit GC pressure on very large runs add:
7	 *   node --max-old-space-size=4096 scripts/rgs-tool-planner.mjs ...
8	 *
9	 * CLI usage:
10	 *   node scripts/rgs-tool-planner.mjs [--
... [+30069 chars truncated]

### Assistant | 2026-05-21T00:17:12.326Z

The adapter content isn't actually in my visible context. Let me read it with explicit cache bypass via Grep for the key parts.

### Assistant | 2026-05-21T00:17:12.812Z

[tool_use: Bash]

### User | 2026-05-21T00:17:25.021Z

[tool_result] /**
 * rgs-calibration-adapter.mjs — CAMConfidenceCalibrationEngine-backed
 * confidence calibration for the rgs-tool-planner.
 *
 * Why this exists (U-LIMA-A7 / RGS-TOOL-AUTOINVOKE-MS1 P1 item #5):
 *   The planner emits a `ToolPlan.confidence` per roadmap unit — the
 *   deterministic path is a mean-of-pipeline-confidences capped at 0.6, the
 *   Ollama path is the model's self-reported number. 
... [+15257 chars truncated]

### Assistant | 2026-05-21T00:17:43.288Z

I have both files. Let me reason through each second-order concern.

**Feedback loop (sidecar write ↔ adapter read):** This is the most serious concern. The adapter joins outcome `unitKey`s against the sidecar's *current* `confidence`. After this run, sidecar confidences are calibrated. The `clearOutcomes()` refeed-from-scratch only prevents *engine-buffer* bleed within a process — it does NOT prevent the calibration mapping itself from being fit against already-calibrated inputs.

Trace it concretely: Run 1 writes calibrated confidence `c1' = f1(c1)` for unit U. Later an outcome for U lands. Run 2's `makeCalibrationFn()` joins U's outcome against the sidecar — recovering `c1'` (calibrated), NOT the raw `c1` the plan was actually generated under. So Run 2 fits the mapping on `(calibrated_pred, wasCorrect)` pairs and produces `f2`. Run 2 then applies `f2` to a *raw* `fuseSignals` confidence. **The mapping is fit on calibrated inputs but applied to raw inputs — a domain mismatch.** This is not runaway divergence (each run re-reads, re-clears, re-fits — bounded), but it is a **systematic calibration error**: `f2` learns "what raw→correct looks like" from already-shifted data, so it mis-corrects. It is self-stabilizing only in the trivial sense that it doesn't explode; it is *not* correct. The adapter's own header even names this — "Confidence-join caveat" — but frames it only as staleness from re-planning, missing that *its own write* guarantees the join recovers a transformed value, not a stale-but-raw one. **P1.**

**Read/write ordering:** `makeCalibrationFn()` runs at line 711-714, fully awaited, BEFORE `runPlanner` at line 715. The planner's atomic flush (`writeFileSync` tmp → `renameSync`) happens only inside `runPlanner`. So the adapter reads the sidecar from the *prior completed run* — never in-progress, never torn. No lock concern: same process, strictly sequential. Clean.

**Determinism / `--force` / checkpoint resume:** `sourceHash` excludes confidence, so ca
... [+2772 chars truncated]
