---
name: skill-recall-tune
title: Skill Recall Tune — MIN_SCORE Calibrator for archived-skill-suggest
description: Read archived-skill-suggest.mjs telemetry, compute P75 of true-positive BM25 scores, recommend a calibrated MIN_SCORE env-var. Replaces the guessed default (6.0) with a data-driven floor.
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
      value: "tune recall|calibrate min_score|archived-skill telemetry|recall threshold"
    score: 0.80
    action: suggest

pipeline_integrations:
  - pipeline: skill-recall-tune-cron      # scheduled task (env-var-host gated)
    phase: weekly
    trigger: "weekly empirical calibration"
    action: invoke
  - pipeline: forge-audit
    phase: layer-4-self-tuning
    trigger: "audit of self-optimizing thresholds"
    action: invoke

loop_contract:
  max_iterations: 1                # single-shot analysis; not iterative
  initial_delay: 0
  inter_iteration_delay: 0
  break_when: all-pass
  state_signal: telemetry
  rollback_on_runaway: false
  done_signals:
    - '{"done": true, "verdict": "RECOMMEND", "min_score": <X>, "samples": <N>}'
    - '{"done": true, "verdict": "INSUFFICIENT_DATA", "samples": <N>, "needed": <M>}'

impact:
  upstream:
    - hook-fire-counts.jsonl (telemetry from archived-skill-suggest.mjs)
    - weekly cron (env-var-host gated)
    - /loop manual invocation
    - operator follow-up to HS-06 Phase 2 ship (commit e27f4e212)
  downstream:
    - recommendation only — operator updates PRISM_ARCHIVED_SKILL_MIN_SCORE env-var
    - .claude/settings.json (if operator applies recommendation)
    - archived-skill-suggest.mjs hit-rate (downstream effect of MIN_SCORE change)
    - state/shared/SKILL-RECALL-TUNING-LOG.md (append-only history of recommendations)
  bounded: true
  reversible: true  # recommendation only; operator approves change
---

# /skill-recall-tune — MIN_SCORE Calibrator

> **Goal:** the `archived-skill-suggest.mjs` hook (commit `e27f4e212`) ships with `MIN_SCORE=6.0` — a guess made before any telemetry existed. After a week of fleet activity, the JSONL telemetry holds dozens-to-hundreds of matched/missed events with their BM25 scores. This skill reads that telemetry, computes the empirical distribution, and recommends a data-driven MIN_SCORE.
>
> **Built for:** the HS-06 Phase 2 follow-up that the original plan §P11 explicitly calls out: "calibrate after telemetry shows real BM25 distributions for the first 200 hits."

## When to use

- After ~1 week of fleet activity post-HS-06 Phase 2 ship (commit `e27f4e212` was 2026-05-12; first useful recall ~2026-05-19)
- When the operator notices either (a) too many false-positive recalls (lower confidence than expected) or (b) too few true-positive recalls (high-confidence archived skills missed)
- As part of `/forge-audit` layer-4 self-tuning sweep
- Triggered weekly via cron once `PRISM_CRON_PRIMARY` env-var-host is configured (Phase D.5 wiring)

## When NOT to use

- Within hours of the recall hook landing — insufficient telemetry samples
- Without at least 50 `matched` events in the telemetry log — the P75 estimate is too noisy below that

## Usage

```
/skill-recall-tune                                  # default: read full telemetry, recommend
/skill-recall-tune --window=<duration>              # e.g. --window=7d (default: all history)
/skill-recall-tune --min-samples=<N>                # require N matched events (default 50)
/skill-recall-tune --apply                          # ALSO write the recommendation to settings.json env-vars
/skill-recall-tune --log                            # append the recommendation to SKILL-RECALL-TUNING-LOG.md
```

## Protocol

### Step 0 — Resolve parameters
- Default window: all-time
- Default min-samples: 50
- Default action: recommend only (no apply)

### Step 1 — Read telemetry
Filter `mcp-server/data/state/hook-fire-counts.jsonl` to lines where:
- `hook === "archived-skill-suggest"`
- `decision === "matched"`
- `ts` within window (if specified)

Extract `top_score` from each matched line.

### Step 2 — Sample-count check
- If matched-event count < `min_samples` → emit `{"done": true, "verdict": "INSUFFICIENT_DATA", "samples": <N>, "needed": <M>}` and exit.

### Step 3 — Compute distribution
Sort the `top_score` values ascending. Compute:
- N (sample count)
- min, max
- P25 (25th percentile)
- P50 (median)
- P75 (75th percentile)
- P95 (95th percentile)
- mean
- stddev

### Step 4 — Recommendation strategy
Default heuristic: **MIN_SCORE = P25** (capture the bottom 75% of historical true-positive matches).

But also consider:
- If P25 < 4.0 → recommend MIN_SCORE = 4.0 (anything lower is BM25-noise)
- If P25 > 8.0 → recommend MIN_SCORE = 8.0 (very tight, might miss edge cases — flag as advisory)
- If P95 - P25 > 5.0 → distribution is wide; recommend operator review the tails manually

Round to one decimal place.

### Step 5 — Surface recommendation
```
┌─ /skill-recall-tune ──────────────────────────────────
│ Telemetry window:  <start> → <end>     (<window-duration>)
│ Matched events:    <N>
│ Score distribution:
│   min       <Smin>
│   P25       <P25>
│   median    <P50>
│   P75       <P75>
│   P95       <P95>
│   max       <Smax>
│   mean      <mean>  ± <stddev>
├──────────────────────────────────────────────────────
│ Current MIN_SCORE:     6.0  (from PRISM_ARCHIVED_SKILL_MIN_SCORE or default)
│ Recommended MIN_SCORE: <new>
│ Rationale:             <explanation per Step-4 heuristic>
│ Hit-rate impact:       at <new> threshold, <K>% of historical matched events would still pass
└──────────────────────────────────────────────────────
```

### Step 6 — (if --apply)
- Read `H:/prism/.claude/settings.json` `env` section
- If `PRISM_ARCHIVED_SKILL_MIN_SCORE` is not present, add it with the recommended value
- If present, replace its value with the recommendation
- Stage + commit with message `[MAIN] [DEV-VELOCITY-AUTOTRIGGER-MS0]/U-A5-RECALL-TUNE-<ts>: recall MIN_SCORE <old> → <new>`

### Step 7 — (if --log)
Append to `state/shared/SKILL-RECALL-TUNING-LOG.md`:
```
## <ISO timestamp>  (N=<samples>, window=<window>)
  Current:     <old>
  Recommended: <new>
  Rationale:   <rationale>
  Applied:     <YES if --apply, NO if recommendation-only>
```

### Step 8 — Emit verdict JSON

## Implementation notes

- **Telemetry path:** `mcp-server/data/state/hook-fire-counts.jsonl` — same path archived-skill-suggest writes to. Read-only here.
- **Sample independence:** each line is an independent event. Bootstrap CI on P25 estimate may be useful when N is small (50-150 range).
- **Multi-chat safety:** read-only on telemetry; --apply writes settings.json which other chats may also be editing. Use `git add` + `git commit` flow + index.lock retry pattern (HS-15 existing infrastructure).
- **Time:** the analysis itself takes <100ms even for 10K telemetry lines. The git operations on --apply take longer (lock + commit).

## Cron integration (Phase D.5 wiring)

Once `PRISM_CRON_PRIMARY` env-var is set on one machine (default proposal: MarkV), schedule:
```
Schedule:  Weekly, Sundays 03:00 local
Action:    node H:/prism/.claude/helpers/run-skill.mjs /skill-recall-tune --log
```
(Or use `/loop 7d /skill-recall-tune --log` if `/loop` runtime supports interval mode at that cadence.)

## What this skill does NOT do

- Does NOT modify `archived-skill-suggest.mjs` itself — only the env-var
- Does NOT change the hook's behavior at runtime (changes apply only after next harness reload)
- Does NOT autocorrect MIN_SCORE without `--apply`
- Does NOT touch any other recall thresholds (TOP_K, MIN_MATCHES) — that's a future tuning unit

## Examples

### Example 1 — first-week check after Phase 2 ship
```
/skill-recall-tune
```
Reads all-time telemetry; if N>=50, surfaces P25-based recommendation; else INSUFFICIENT_DATA.

### Example 2 — apply recommendation
```
/skill-recall-tune --apply --log
```
Updates settings.json env-var + commits + logs to SKILL-RECALL-TUNING-LOG.md.

### Example 3 — focused window
```
/skill-recall-tune --window=7d
```
Just the last week — useful when fleet activity shifted (new milestone domain, new archived buckets).

## See also

- `.claude/hooks/archived-skill-suggest.mjs` — the recall hook this skill tunes (commit `e27f4e212`)
- `mcp-server/data/state/hook-fire-counts.jsonl` — telemetry source
- `state/shared/SKILL-AUTO-TRIGGER-PLAN.md` Phase A.5 — this skill's milestone
- `state/shared/HS-06-SMART-RECALL-PLAN.md` Phase 2 — the recall hook's original calibration note ("MIN_SCORE 6.0 is a guess; should be empirical after 1 week of telemetry")
- `/hook-profile`, `/hook-stats` — sibling telemetry-analysis skills (different surfaces)
