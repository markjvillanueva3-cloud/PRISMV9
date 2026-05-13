---
name: wire-unwired
title: Wire Unwired — Umbrella for Wiring Sprints
description: One command that orchestrates the full wiring sprint pipeline — `/dispatcher-coverage` picks the dispatcher, `/forge-wiring` proposes the engine→dispatcher hooks, `/wiring-batch` applies the batch, `/unwired-review` confirms post-state. Replaces the 4-skill manual chain with a single suggest-then-apply flow. Companion to (not replacement for) the underlying skills.
type: skill
model: sonnet
effort: medium
context: development
allowed-tools:
  - Bash
  - Read

# ── Auto-trigger frontmatter (forward-compat for Phase D orchestrator) ──
triggers:
  - event: UserPromptSubmit
    matcher:
      type: keyword
      value: "wire unwired|wiring sprint|wire engines to dispatcher|wire batch|unwired sweep|dispatcher hookup|engine fan-out"
    score: 0.85
    action: suggest

pipeline_integrations:
  - pipeline: roadmap                  # roadmap doctrine
    phase: wiring-pass
    trigger: "scheduled wiring sweep cadence"
    action: invoke
  - pipeline: forge-audit              # /forge-audit layer-2
    phase: layer-2-wiring
    trigger: "auto-fix surfaced unwired engines"
    action: invoke
  - pipeline: rgs                      # /rgs propose-phase
    phase: post-engine-build
    trigger: "after RGS proposes new engines, schedule their wiring"
    action: invoke
  - pipeline: close-out                # /close-out
    phase: pre-flip
    trigger: "verify no unwired engines block milestone closure"
    action: invoke-if-engines-shipped

loop_contract:
  max_iterations: 5                # propose→apply→verify→repeat for new gaps; cap at 5
  initial_delay: 0
  inter_iteration_delay: 0
  break_when: converged             # converged = unwired count not decreasing or zero
  state_signal: unwired_count
  rollback_on_runaway: true         # if 3 iterations don't decrease unwired, halt + surface manual
  done_signals:
    - '{"done": true, "verdict": "CONVERGED", "wired_added": <N>, "remaining": <R>}'
    - '{"done": true, "verdict": "NO_UNWIRED"}'
    - '{"done": true, "verdict": "MANUAL_REQUIRED", "blocked_by": [<...>]}'

impact:
  upstream:
    - state/shared/ENGINE_WIRING_INDEX.json (drives the unwired list)
    - state/shared/BUILD_STATE.json (NEEDS_WIRING bucket)
    - /dispatcher-coverage (Phase B.1) — picks target dispatcher
    - /forge-wiring — proposes dispatcher action additions
    - /wiring-batch — applies the batch
    - /unwired-review — confirms post-state
    - /coverage-by-domain — sibling axis view (this skill works dispatcher-axis)
  downstream:
    - mcp-server/src/tools/dispatchers/*.ts (action enum + case additions)
    - mcp-server/src/engines/index.ts (regenerated via build-engine-index.mjs)
    - state/shared/ENGINE_WIRING_INDEX.json (regenerated)
    - state/shared/BUILD_STATE.json (NEEDS_WIRING bucket shrinks)
    - commits land per /wiring-batch's own commit discipline
    - informs: /close-out (whether engine-wiring blockers remain)
  bounded: true
  reversible: true  # the underlying /wiring-batch has --dry-run; this orchestrator preserves that
---

# /wire-unwired — Umbrella Skill for Wiring Sprints

> **Goal:** today, wiring an unwired engine requires (a) `/dispatcher-coverage` to find the home, (b) `/forge-wiring` to propose the patch, (c) `/wiring-batch` to apply, (d) `/unwired-review` to confirm. Four invocations + manual stitching. This skill is the single entry point: feed it a domain or count, get a fully-applied + verified wiring batch (or a clear blocker explanation).
>
> **Built for:** the recurring "879 unwired engines" symptom in BUILD_STATE. Each domain (Lathe 89, Other 143, etc.) needs its own classifier — surfacing the right dispatcher per engine. This skill does that fan-out in one loop.

## When to use

- After RGS proposes a batch of new engines — wire them in the same sprint
- During `/forge-audit` layer-2 — auto-apply the surfaced gaps
- As a scheduled wiring cadence (every Sunday 04:00) via PRISM_CRON_PRIMARY env-var
- After a milestone close that produced unwired engines (close-out gate flags them)
- For a domain-focused sweep ("wire the 89 Lathe orphans")

## When NOT to use

- For single-engine wiring (use `/forge-wiring` directly)
- When the engine→dispatcher fit is non-obvious (use `/forge` brainstorming first)
- When wiring would cross the cross-worktree firewall (settings.json / state/shared/*) — those changes must happen in the main tree (this skill respects the firewall)

## Usage

```
/wire-unwired                                   # default: dry-run, propose batch for top-25 by domain frequency
/wire-unwired --domain=<name>                   # focus on one domain (Lathe, Other, Machine, WEDM)
/wire-unwired --max=<N>                         # cap batch at N engines (default 25)
/wire-unwired --apply                           # actually run the chain (else propose only)
/wire-unwired --auto-confirm                    # apply without per-batch operator prompt
/wire-unwired --skip-tests                      # skip vitest verification after wiring (faster, less safe)
/wire-unwired --output-json                     # state/shared/WIRE_UNWIRED_REPORT.json
/wire-unwired --dispatcher=<name>               # force ALL engines into this dispatcher (override classifier)
```

## Protocol

### Step 0 — Resolve parameters + load state
```bash
node H:/prism/scripts/build-engine-index.mjs >/dev/null 2>&1  # regen wiring index
node H:/prism/scripts/build-state-snapshot.mjs >/dev/null 2>&1 # regen BUILD_STATE
```
Read `state/shared/ENGINE_WIRING_INDEX.json` for the canonical unwired list. Filter by `--domain` if set (matched against engine-name prefix).

### Step 1 — Per-engine dispatcher classification
For each unwired engine (capped at `--max`):
- Extract domain prefix (first capitalized run): `LatheGroovingEngine` → `Lathe`
- Lookup canonical dispatcher map (cached at `state/shared/DISPATCHER_HOME_MAP.json`):
  | Domain | Default dispatcher | Fallback |
  |--------|-------------------|----------|
  | Mill / Milling | millDispatcher | camDispatcher |
  | Lathe / Turning | turningDispatcher | camDispatcher |
  | WEDM / Wire / Sinker | edmDispatcher | (none — escalate) |
  | CAD | cadDispatcher | cadAutomationDispatcher |
  | CAM | camDispatcher | (none) |
  | Cutting / Force / Thermal / Vibration | calcDispatcher | (none) |
  | AI / Reasoning / Deep / Neural | aiReasoningDispatcher | intelligenceDispatcher |
  | Safety | safetyDispatcher | calcDispatcher |
  | Quality / SPC / FAI / GD&T | qualityDispatcher | (none) |
  | Business / Job / Order / Quote | businessDispatcher | (none) |
  | (no clean match) | — | escalate (manual) |
- If `--dispatcher=<name>` set, override classifier for all rows.

### Step 2 — Surface the proposal
```
┌─ /wire-unwired ─────────────────────────────────────
│ Unwired engines: <U>     Targeted this run: <N>     Domain filter: <D|all>
├─────────────────────────────────────────────────────
│ Engine                              Domain   Target dispatcher          Confidence
│ LatheGroovingEngine                 Lathe    turningDispatcher          high
│ LatheLoraStudioEngine               Lathe    turningDispatcher          high
│ CrossProcessNeuralEngine            Cross    calcDispatcher             medium
│ AdvancedConicEngine                 Advanced (no match — escalate)      —
│ ...
├─────────────────────────────────────────────────────
│ Escalations (manual review): <K>
│ Apply? [y/N]
└─────────────────────────────────────────────────────
```

### Step 3 — (if --apply) per-dispatcher batch loop
Group proposals by target dispatcher. For each group:

#### Step 3a — Delegate to /forge-wiring (proposal phase)
```bash
node H:/prism/.claude/helpers/run-skill.mjs /forge-wiring \
  --dispatcher <name> --engines "<comma-separated>" --dry-run
```
Captures the proposed patch.

#### Step 3b — Delegate to /wiring-batch (apply phase)
```bash
node H:/prism/.claude/helpers/run-skill.mjs /wiring-batch \
  --dispatcher <name> --engines "<comma-separated>" --apply
```
This is the surface that actually patches dispatcher source + adds tests.

#### Step 3c — Per-batch verification
```bash
# Regen the wiring index to confirm
node H:/prism/scripts/build-engine-index.mjs >/dev/null 2>&1

# Optionally run affected tests
[ "<--skip-tests>" != "1" ] && npx vitest run --reporter=basic <affected test files>
```

#### Step 3d — Per-batch operator gate (if NOT --auto-confirm)
Surface the dispatcher delta + test result. Operator approves OR aborts. Aborted dispatcher skipped; remaining queue continues.

### Step 4 — Loop convergence check (max 5 iterations)
After all proposed groups applied:
- Regen wiring index + BUILD_STATE
- Recompute unwired count
- If decreased AND new unwireds surfaced (e.g. peer chats shipped new engines) AND iteration < 5 → loop
- If decreased to zero → CONVERGED
- If 3 consecutive iterations don't decrease → MANUAL_REQUIRED with the stuck rows
- `rollback_on_runaway: true` enforces the halt

### Step 5 — Delegate to /unwired-review (post-state confirmation)
```bash
node H:/prism/.claude/helpers/run-skill.mjs /unwired-review
```
Sanity check that the canonical post-state matches the propose-time expectations.

### Step 6 — (if --output-json) write report

### Step 7 — Emit verdict JSON

## Implementation notes

- **Each underlying skill remains the source of truth** for its surface — this skill is pure orchestration. If `/wiring-batch` changes its commit format, this skill inherits.
- **Cross-worktree firewall awareness:** if any proposed dispatcher file (in `mcp-server/src/tools/dispatchers/`) is owned by a peer chat per `state/shared/chat-bus/claims/`, this skill SKIPS that dispatcher and surfaces a `peer-owned` row. Use `/peer-file-isolation --post-proposing` to coordinate before retrying.
- **Test cost:** `--skip-tests` reduces wiring sprint time by ~10x. Safe for purely-additive enum/case additions; unsafe if you suspect ripple. Defaults to running tests.
- **`DISPATCHER_HOME_MAP.json` is the classifier source** — operator can extend it manually for new domains. The skill reads it freshly each invocation; no hard-coded routing in this file.
- **Singleton dispatchers (engine_count=1)** — flag for consolidation. This skill does NOT auto-consolidate; surface the singleton in the report so operator can decide.
- **Atomic commit per dispatcher:** each `/wiring-batch` invocation produces its own commit (the underlying skill's discipline). This skill does NOT bundle commits — multi-dispatcher batches produce multi-commit history, easier to revert.

## What this skill does NOT do

- Does NOT directly edit dispatcher source (delegates to `/wiring-batch`)
- Does NOT propose new engines (delegate to `/forge` or `/rgs`)
- Does NOT create new dispatchers (use `/forge` + manual planning)
- Does NOT modify the cross-worktree firewall-protected files (settings.json, state/shared/*)
- Does NOT replace `/coverage-by-domain` — that's the engine-name-prefix axis; this is the dispatcher-axis wiring action

## Examples

### Example 1 — dry-run survey
```
/wire-unwired
```
Top-25 proposal across all domains. Surfaces high/medium/escalate counts.

### Example 2 — domain-focused sweep
```
/wire-unwired --domain=Lathe --max=30 --apply
```
Wire 30 Lathe engines into turningDispatcher (per classifier).

### Example 3 — CI / cron mode
```
/wire-unwired --apply --auto-confirm --skip-tests --max=10
```
Conservative auto-cadence batch.

### Example 4 — singleton consolidation prep
```
/wire-unwired --output-json
```
Surfaces escalations (no-match domain) + singletons. Operator manually plans new dispatcher home.

### Example 5 — full convergence run
```
/wire-unwired --apply --max=200
```
Aggressive single-session sweep. Loop contract caps at 5 iterations.

## See also

- `state/shared/ENGINE_WIRING_INDEX.json` — wiring data
- `state/shared/BUILD_STATE.json` — NEEDS_WIRING bucket
- `state/shared/DISPATCHER_HOME_MAP.json` — classifier source (operator-maintained)
- `/dispatcher-coverage` (Phase B.1) — dispatcher-axis view this skill consumes
- `/forge-wiring` — per-engine wiring proposal (this skill delegates here)
- `/wiring-batch` — batch apply (this skill delegates here)
- `/unwired-review` — post-state confirm (this skill delegates here)
- `/coverage-by-domain` — sibling domain-axis view
- `/peer-file-isolation` (Phase B.2) — pre-flight peer-claim check
- `state/shared/SKILL-AUTO-TRIGGER-PLAN.md` Phase D.1 — this skill's milestone
