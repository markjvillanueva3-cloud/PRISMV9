---
title: PRISM pipeline — /scrutiny-gate (per-file 2-reviewer + end-of-task 3-of-3)
slug: scrutiny-gate
kind: pipeline
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK19
author: claude-2d30710b (slot hotel, /loop command-kernel)
trigger: command
composed_of: [scrutiny-3way-emit, parallel-agent-dispatch, ledger-mark, stop-hook-backstop]
stages: [emit-prompts, dispatch-agents, collect-verdicts, mark-ledger]
consumes:
  - .claude/scripts/scrutiny-3way.mjs
  - .claude/hooks/scrutinize-before-stop.mjs
  - mcp-server/data/state/SCRUTINY_LEDGER.json
produces:
  - scrutiny-ledger-entry
  - per-file-pass-confirmation
  - operator-verdict-record
downgrade:
  mode: hard-stop
  fallback_to: stop-hook-3-block-auto-pass
telemetry:
  ledger: state/shared/pipeline-telemetry.jsonl
  fields: [fire_ts, chain_id, step_id, latency_ms, outcome, session_id, slot]
---

# `/scrutiny-gate` — Composed Scrutiny Front-End (U-CK19)

Operator-facing skin over the two canonical PRISM review gates: the
per-file 2-reviewer doctrine and the end-of-task 3-of-3 Stop gate.
Adds 0 new logic — every step maps to an existing surface
(`scrutinize-before-stop.mjs` Stop hook, `scrutiny-3way.mjs` arm
emitter, Task-tool parallel dispatch, SCRUTINY_LEDGER).

## Two operator-facing modes

### Mode A — `per-file`

Fires inside any multi-file build BEFORE the next file is generated.
2 parallel Task-tool agents:

| Agent | subagent_type | Weighted |
|-------|---------------|----------|
| A — content-specialist | (auto by file type) | per-domain correctness |
| B — independent reviewer | `reviewer` | integration, conventions, stubs, security |

File-type → agent-A mapping:

| File type | Agent A |
|-----------|---------|
| dispatcher | wiring-review-agent |
| test | test-review-agent |
| physics engine | physics-review-agent |
| generic engine / util | code-analyzer |
| docs / spec | reviewer |
| UI (.tsx) | reviewer |

Both must return PASS before next file. Either FAIL → fix → re-dispatch.

### Mode B — `end-of-task` (Stop-gate ceremony)

The 3-of-3 ceremony the `scrutinize-before-stop.mjs` Stop hook expects:

1. `scrutiny-3way.mjs --session-id <id>` emits three reviewer prompts.
2. Three Task agents dispatched in parallel:
   - reviewer (arm A — holistic)
   - reviewer (arm B — independent second pass)
   - code-analyzer (arm C — silent-breakage focus)
3. Three `--mark-{opus,claude,analyst} pass` recordings to the ledger.

The Stop hook keeps blocking until all three arms are PASS in the
ledger; 3-block auto-pass is the escape hatch (with WARNING).

## Why three arms, not two

| Arm | Catches |
|-----|---------|
| A | correctness, contract conformance, immediate user impact |
| B | test integrity, dispatcher wiring completeness, inlined-constant detection, stub assertions — what A is least likely to flag |
| C | regression risk, I/O security, error budget completeness, silent-degrade — what A and B are least likely to flag |

3-of-3 consensus (not 2-of-3) means a single arm's drift is not
load-bearing. This was a 2026-05-05 doctrine adoption (CLAUDE.md
§SCRUTINY GATE) after observing 2-arm drift.

## Stages

| # | Stage | Purpose | Side-effect |
|---|-------|---------|-------------|
| 1 | emit-prompts | run `scrutiny-3way.mjs --session-id <id>`; capture JSON | none (read-only) |
| 2 | dispatch-agents | single message, N parallel Task calls (N=2 for Mode A, N=3 for Mode B) | spawns N sub-agents |
| 3 | collect-verdicts | wait for ALL agents to return; merge with operator self-check | none |
| 4 | mark-ledger | for each PASS: `scrutiny-3way.mjs --mark-X pass --notes "..."` | appends to SCRUTINY_LEDGER.json |

A FAIL at stage 3 means stage 4 ONLY marks the passing arms;
the failing arm gets fix → re-dispatch → re-mark.

## Rollback

This skill has no destructive side-effects. The SCRUTINY_LEDGER is
append-only by design. A "rollback" is just NOT marking a failed arm —
the Stop hook continues to block, which is the desired state.

## Knobs

- `PRISM_SCRUTINY_GIT_TIMEOUT_MS` — diff capture timeout (default 120s)
- `PRISM_SCRUTINY_NO_DIFF_FILTER=1` — full unfiltered diff
- The Stop hook is in MINIMAL_ALLOWLIST — cannot be disabled by `PRISM_HOOK_PROFILE`. The skill respects this — does not attempt bypass.

## Karpathy discipline pins

- **R8**: skill adds 0 logic. Every step is an existing surface.
- **R10**: each stage's exit is an explicit verdict (PASS / FAIL per arm); next stage starts only after the prior stage's verdict is recorded.
- **R11**: arm weighting is fixed — A holistic, B test/wire/stub, C silent-breakage. Collapsing arms breaks the doctrine.
- **R12**: FAIL surfaces the finding; auto-pass escape hatch fires only after 3 block attempts AND emits a warning. No silent pass.

## Composes-with

Composed BY:

- `/session-cycle` (U-CK17) — Mode A internal to BUILD; Mode B at end before HANDOFF
- `/forge-supervised` (U-CK24) — Mode B at the end of `/forge-triple`
- `/loop` autonomous iter — Mode B fires implicitly via Stop hook at iter boundary
- direct operator invocation mid-session

Composes:

- `.claude/scripts/scrutiny-3way.mjs`
- `.claude/hooks/scrutinize-before-stop.mjs`
- `mcp-server/data/state/SCRUTINY_LEDGER.json`
- `Task` tool (parallel agent dispatch)

## Related

- [[session-cycle]] — the chain that fires both modes
- [[loop]] — the autonomous-iter wrapper
- [[goal-complete]] — sister Stop-hook gate (ceremonial-end)
- [[research]] — preceding stage in session-cycle

## See also

- `.claude/commands/scrutiny-gate.md` — operator skill spec (gitignored mirror)
- `feedback_parallel_scrutiny_per_file.md` — per-file gate doctrine origin
- `feedback_scrutiny_gate_finds_hostile_payload_class.md` — arm-B catching what arm-A missed
- `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json` U-CK19 — the unit envelope
