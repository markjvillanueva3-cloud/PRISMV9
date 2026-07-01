---
name: envelope-drift-fix
title: Envelope Drift Fix — Detect + Auto-Apply + Full Close-Out
description: Orchestrator that combines `/envelope-sync` (drift detection + patch proposal), automatic patch application (gated by --fix), AND the 4-surface close-out per the roadmap-close-out doctrine (roadmap-index, MILESTONE_PROGRESS, BUILD_STATE, chat-bus). One command instead of five. Companion to (not replacement for) `/envelope-sync` and `/close-out`.
type: skill
model: sonnet
effort: low
context: development
allowed-tools:
  - Bash
  - Read

# ── Auto-trigger frontmatter (forward-compat for Phase D orchestrator) ──
triggers:
  - event: UserPromptSubmit
    matcher:
      type: keyword
      value: "fix envelope drift|auto-fix milestone|envelope drift apply|close-out drifted|milestone reconcile auto"
    score: 0.85
    action: suggest
  - event: PostToolUse
    matcher:
      type: tool
      value: "Bash"
      command_regex: "build-milestone-progress\\.mjs"
    score: 0.50
    action: suggest

pipeline_integrations:
  - pipeline: forge-audit            # /forge-audit layer-1
    phase: layer-1-envelope
    trigger: "audit of envelope drift; auto-fix when surfaced"
    action: invoke
  - pipeline: handoff                # /handoff
    phase: pre-write
    trigger: "ensure no drifted envelopes leak into handoff narrative"
    action: invoke-if-drift
  - pipeline: close-out              # /close-out (per [[feedback_roadmap_close_out]])
    phase: pre-flip
    trigger: "verify all 4 surfaces aligned before envelope status flip"
    action: invoke
  - pipeline: roadmap                # roadmap doctrine
    phase: post-unit-ship
    trigger: "after shipping a unit, verify envelope reflects it"
    action: invoke-if-shipped

loop_contract:
  max_iterations: 3                # multiple drifts may surface sequentially; cap at 3 per run
  initial_delay: 0
  inter_iteration_delay: 0
  break_when: converged             # converged = no drift remains
  state_signal: drift_count
  rollback_on_runaway: false        # the underlying /envelope-sync --apply is operator-approved per its own gate
  done_signals:
    - '{"done": true, "verdict": "CONVERGED", "drifts_fixed": <N>, "iterations": <I>}'
    - '{"done": true, "verdict": "NO_DRIFT"}'
    - '{"done": true, "verdict": "MANUAL_REQUIRED", "blockers": [<...>]}'

impact:
  upstream:
    - state/shared/MILESTONE_PROGRESS.json (the drift detector output)
    - mcp-server/data/milestones/*.json (envelope JSONs to be patched)
    - mcp-server/data/roadmap-index.json (close-out surface 1)
    - state/shared/BUILD_STATE.json (close-out surface 2)
    - state/shared/AGENT_CHAT.md (close-out surface 3 — chat bus)
    - /envelope-sync (delegate for drift detection + per-envelope patch)
    - /close-out (delegate for the 4-surface update)
  downstream:
    - mcp-server/data/milestones/<MS-ID>.json patched (status flip)
    - mcp-server/data/roadmap-index.json updated (status reflects envelope)
    - state/shared/MILESTONE_PROGRESS.{md,json} regenerated
    - state/shared/BUILD_STATE.{md,json} regenerated
    - chat-bus post via agent-coordination.mjs
    - commit landed (or staged if --no-commit)
  bounded: true
  reversible: true  # default --dry-run; --fix gated by per-envelope operator confirmation OR --auto-confirm
composes_with:
  - "/close-out"
  - "/envelope-sync"
  - "/forge-audit"
  - "/handoff"
---
# /envelope-drift-fix — Detect + Auto-Apply + Close-Out

> **Goal:** the existing `/envelope-sync --apply` patches the envelope JSON, but the [[feedback_roadmap_close_out]] doctrine says a milestone is only really closed when ALL 4 surfaces agree (envelope + roadmap-index + MILESTONE_PROGRESS + BUILD_STATE + chat-bus post). `/envelope-sync` alone does surface 1 only. `/close-out` does all 4 but requires the operator to name the milestone.
>
> This skill is the **drift-driven** orchestrator: read MILESTONE_PROGRESS.json → for each drifted milestone, propose the envelope patch (via /envelope-sync) → apply (with --fix or --auto-confirm) → run /close-out → commit. One command, all 4 surfaces, zero "I forgot to update X" follow-ups.
>
> **Built for:** the recurring pattern that prompted the `enforce-roadmap-closeout` Stop hook — envelope says `completed` but BUILD_STATE still flags drift because roadmap-index never got updated.

## When to use

- After shipping the last unit of a milestone — close out cleanly in one command
- During `/forge-audit` layer-1 — auto-fix drifted milestones the audit surfaces
- After `build-milestone-progress.mjs` reports `>0` drifts
- When the `enforce-roadmap-closeout` Stop hook blocks a session — diagnose with `/envelope-drift-fix` (dry-run), then apply
- Inside `/handoff` pre-write — flush pending closeouts before recording the handoff

## When NOT to use

- For a milestone where you genuinely WANT to keep envelope ≠ git state (rare; e.g. a milestone is being intentionally re-opened) — use `/envelope-sync` directly for surgical patching
- For ad-hoc envelope edits (use `/envelope-sync`)
- When the close-out doctrine doesn't apply (e.g. envelopes for in-flight feature flags) — those should never reach MILESTONE_PROGRESS's drift list anyway

## Usage

```
/envelope-drift-fix                                       # default: --dry-run, surface drifts only
/envelope-drift-fix --fix                                 # apply patches; prompt per-envelope before each commit
/envelope-drift-fix --auto-confirm                        # apply WITHOUT per-envelope prompts (CI / cron mode)
/envelope-drift-fix --milestone=<MS-ID>                   # focus on one milestone
/envelope-drift-fix --direction=stale-completed-only      # only flip envelope=completed → in_progress (the dangerous direction; surface units still pending)
/envelope-drift-fix --direction=shipped-not-flipped       # only flip envelope=not_started → in_progress where commits exist
/envelope-drift-fix --no-close-out                        # patch envelope only; skip the 4-surface update (back-compat with /envelope-sync)
/envelope-drift-fix --no-commit                           # stage patches but don't commit (for manual review)
/envelope-drift-fix --output-json                         # state/shared/ENVELOPE_DRIFT_FIX_REPORT.json
```

## Protocol

### Step 0 — Resolve parameters + load drift state
```bash
node H:/prism/scripts/build-milestone-progress.mjs >/dev/null 2>&1     # regen fresh
```
Read `state/shared/MILESTONE_PROGRESS.json`. Each row has:
- `milestoneId`
- `claimedStatus` (from envelope)
- `derivedStatus` (from git log)
- `unitsShipped[]`, `unitsPending[]`
- `driftReason` (if `claimedStatus !== derivedStatus`)

Filter to rows where `driftReason` is non-empty AND (no `--milestone` filter, or matches).

### Step 1 — Classify each drift
| `claimedStatus` | `derivedStatus` | Class | Auto-fixable? |
|-----------------|-----------------|-------|---------------|
| `not_started` | `in_progress_real` | shipped-not-flipped | YES (advance to in_progress) |
| `not_started` | `completed_real` | shipped-not-flipped | YES (advance to completed) |
| `in_progress` | `completed_real` | shipped-not-flipped | YES (advance to completed) |
| `completed` | `not_started_real` | stale-completed | NO — manual review (envelope claimed done but git shows no commits; possible mis-fire) |
| `completed` | `in_progress_real` | stale-completed | NO — manual review (units still pending; envelope shouldn't claim completed yet) |
| `in_progress` | `not_started_real` | rollback-needed | NO — manual review (envelope ahead of reality) |

`--direction=stale-completed-only` filters to the `stale-completed` class (the dangerous one).
`--direction=shipped-not-flipped` filters to the auto-fixable forward direction.

### Step 2 — Per-drift loop (max 3 per run; loop_contract enforces)
For each drift row:

#### Step 2a — Delegate envelope patching to /envelope-sync
```bash
node H:/prism/.claude/helpers/run-skill.mjs /envelope-sync --milestone <MS-ID> --dry-run
# Captures the proposed patch JSON
```
If `--fix` or `--auto-confirm`:
```bash
node H:/prism/.claude/helpers/run-skill.mjs /envelope-sync --milestone <MS-ID> --apply
```
The `--apply` mutates `mcp-server/data/milestones/<MS-ID>.json` only.

#### Step 2b — (if not --no-close-out) run /close-out for the same milestone
```bash
node H:/prism/scripts/close-out-milestone.mjs --milestone <MS-ID>
```
This regenerates MILESTONE_PROGRESS + BUILD_STATE + updates roadmap-index + posts chat-bus.

#### Step 2c — Per-envelope confirmation gate (if --fix and NOT --auto-confirm)
Surface the patch + close-out delta:
```
Envelope: <MS-ID>
  Before: { status: "not_started" }
  After:  { status: "in_progress" }
  Units shipped (per git): U-XXX, U-YYY, U-ZZZ
  Roadmap-index update: status field for <MS-ID> → "in_progress"
  BUILD_STATE delta: <MS-ID> moved from STALE_MILESTONES to in-flight
Apply? [y/N]
```
Operator approves OR aborts THIS row. Aborting row N continues to row N+1.

`--auto-confirm` skips the gate (suitable for cron / `/forge-audit` mode where each drift is independently classified safe).

### Step 3 — Aggregate commit (if --fix and NOT --no-commit)
After all approved rows are applied, single commit:
```bash
git add mcp-server/data/milestones/*.json mcp-server/data/roadmap-index.json \
        state/shared/MILESTONE_PROGRESS.{md,json} state/shared/BUILD_STATE.{md,json}
git commit -m "[MAIN] [<auto-derived-scope>]: envelope-drift-fix sweep — <N> milestones reconciled"
```
Auto-derived scope: most-recent commit's `[SCOPE-MS#]` tag, or the milestone-ID of the most-impacted envelope, or `INFRA-DRIFT`.

### Step 4 — Re-check convergence
```bash
node H:/prism/scripts/build-milestone-progress.mjs >/dev/null 2>&1
```
Read MILESTONE_PROGRESS.json again. If `drifts.length > 0` AND `iteration < max_iterations` → loop. If `drifts.length === 0` → CONVERGED. If still drifts AFTER 3 iterations → MANUAL_REQUIRED (something is fighting the auto-fix; surface the stuck rows).

### Step 5 — Surface report
```
┌─ /envelope-drift-fix ────────────────────────────────
│ Iterations: <I>     Drifts processed: <D>     Auto-fixed: <A>     Manual: <M>
├──────────────────────────────────────────────────────
│ <MS-ID>                  Δstatus         Class                 Action
│ XPROC-NEURAL-OPT-MS0     not_started→in  shipped-not-flipped   APPLIED
│ CAD-FUSION-LIVE-MS0      not_started→cmpl shipped-not-flipped  APPLIED
│ MF-MS1                   completed→noop  stale-completed       MANUAL (envelope claims done; no commits)
├──────────────────────────────────────────────────────
│ Commit: <sha> — <auto-derived-scope>: envelope-drift-fix sweep
│ Close-out surfaces updated: 4/4
│ Chat-bus posted: yes
└──────────────────────────────────────────────────────
```

### Step 6 — (if --output-json) write report (atomic temp+rename)

### Step 7 — Emit verdict JSON

## Implementation notes

- **/envelope-sync is the source of truth for per-envelope patching** — this skill never directly edits envelope JSONs. If envelope-sync changes its schema, this skill inherits automatically.
- **/close-out is the source of truth for the 4-surface update** — this skill never directly regenerates BUILD_STATE / roadmap-index. If close-out changes its surfaces, this skill inherits.
- **Loop contract = max 3 iterations** because a runaway loop would indicate either (a) a deeper inconsistency that needs human eyes, or (b) a peer chat racing the fix. Either way, surface MANUAL_REQUIRED and stop.
- **`stale-completed` class is NEVER auto-fixed** — the only safe automated rollback is `completed → in_progress` after manual ACK that units are still pending. Auto-rollback would race the original closer chat. Surface only.
- **Multi-chat safety:** each iteration regenerates MILESTONE_PROGRESS to pick up peer-applied fixes. A peer chat closing the same milestone is detected (`derivedStatus` already matches) and the row drops from the work list automatically.
- **Atomic commit:** the aggregate commit is one transaction; if `git commit` fails mid-way, the patches are still in the working tree and the next iteration retries cleanly.
- **`--no-commit` mode:** patches staged but not committed; useful for `/handoff` review or pre-merge worktree inspection. Operator runs `git commit` manually with the surfaced message.

## What this skill does NOT do

- Does NOT directly edit envelope JSONs (delegates to `/envelope-sync`)
- Does NOT directly regenerate BUILD_STATE / roadmap-index (delegates to `/close-out`)
- Does NOT roll back completed envelopes automatically (surfaces only — operator must approve)
- Does NOT touch milestones where `claimedStatus === derivedStatus` (no drift)
- Does NOT replace the `enforce-roadmap-closeout` Stop hook — the hook still runs and still blocks if surfaces are out of sync (this skill is the cure; the hook is the diagnostic)

## Examples

### Example 1 — dry-run survey
```
/envelope-drift-fix
```
Lists every drifted milestone with classification + recommendation. No mutation.

### Example 2 — auto-fix the safe direction
```
/envelope-drift-fix --fix --direction=shipped-not-flipped
```
Applies only the safe forward-flips. Stale-completed cases surface as MANUAL.

### Example 3 — surface stale-completed for review
```
/envelope-drift-fix --direction=stale-completed-only
```
Lists envelopes claiming completed but git shows otherwise. Operator triages manually.

### Example 4 — CI / cron mode (no prompts)
```
/envelope-drift-fix --fix --auto-confirm --no-close-out  # only envelope patches; close-out runs in a separate cron
```
Use when a downstream cron handles close-out.

### Example 5 — focused single-milestone fix
```
/envelope-drift-fix --milestone=XPROC-NEURAL-OPT-MS0 --fix
```
Single envelope + its close-out surfaces.

### Example 6 — pre-handoff cleanup
```
/envelope-drift-fix --fix --auto-confirm
/handoff
```
Ensure no drift survives into the handoff narrative.

## See also

- `.claude/commands/envelope-sync.md` — per-envelope drift detection + patch (this skill is the orchestrator)
- `.claude/commands/close-out.md` — 4-surface close-out (this skill calls into it)
- `.claude/hooks/enforce-roadmap-closeout.mjs` — Stop hook that blocks on drift (this skill is the cure)
- `state/shared/MILESTONE_PROGRESS.{md,json}` — drift data source
- `mcp-server/data/milestones/*.json` — envelopes
- `mcp-server/data/roadmap-index.json` — top-level catalog (surface 1 of 4)
- `state/shared/BUILD_STATE.json` — built-vs-pending snapshot (surface 2 of 4)
- `state/shared/AGENT_CHAT.md` — chat-bus post (surface 3 of 4)
- [[feedback_roadmap_close_out]] — doctrine this skill enforces
- `state/shared/SKILL-AUTO-TRIGGER-PLAN.md` Phase B.5 — this skill's milestone
