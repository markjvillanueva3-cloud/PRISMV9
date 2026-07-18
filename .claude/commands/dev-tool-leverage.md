---
description: Run the dev-tool leverage aggregator — one command, 4 META audits in a unified ranked dashboard. Surfaces the highest-leverage dev-pipeline gaps (synergy regressions, stale milestones, cold scripts, orphan helpers) with cron-friendly exit codes.
composes_with:
  - "/close-out-audit"
  - "/forge-audit"
  - "/pick-unit"
  - "/system-viz"
---
# /dev-tool-leverage — META audit aggregator

Orchestrates the four dev-pipeline META tools shipped during DEV-TOOLS-AUDIT-F2+F3+F4 and emits a single ranked dashboard. Use this instead of running the 4 sub-tools by hand.

## What it does (one-line)

```bash
node H:/prism/scripts/dev-tool-leverage-rank.mjs
```

Parallel-spawns:
- `scripts/synergy-regression-watch.mjs` — system synergy ratio + week-over-week alert
- `scripts/stale-milestone-rank.mjs` — roadmap stale-milestone ranking
- `scripts/cold-script-rank.mjs` — likely-dead `scripts/*.mjs|*.py`
- `scripts/helper-orphan-rank.mjs` — orphan `.claude/helpers/*.mjs`

…then merges findings into a severity-ranked table (`p0 > p1 > p2 > p3 > info`).

## When to invoke proactively

- Operator asks "what's the highest-leverage thing to fix?" / "audit dev tools" / "find dead code"
- Before opening a `/forge-audit` — get the empirical baseline first
- After a milestone close-out — verify no regressions surfaced
- Cron / scheduled task — exit code 1 on any P0/P1 makes it CI-friendly

## Output modes

```bash
# Text dashboard (default, top-25 findings)
node H:/prism/scripts/dev-tool-leverage-rank.mjs

# Machine-readable (CI / hook consumption)
node H:/prism/scripts/dev-tool-leverage-rank.mjs --json

# Single sub-tool
node H:/prism/scripts/dev-tool-leverage-rank.mjs --tools synergy
node H:/prism/scripts/dev-tool-leverage-rank.mjs --tools stale,cold

# Deterministic for tests / CI baselines
node H:/prism/scripts/dev-tool-leverage-rank.mjs --frozen-time 2026-05-17T00:00:00Z
```

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Healthy — no P0/P1 findings |
| 1 | At least one P0 or P1 finding (cron-friendly alert signal) |
| 2 | All sub-tools failed / input error |

## Interpreting findings

### Synergy
- `p0` alert: ratio regressed > 2.0pp week-over-week — primary dev-pipeline health metric crashed
- `p1` alert: ratio regressed > 0.5pp — investigate before it compounds
- `info`: ratio stable

### Stale milestones
- Headline `p1` when > 50% of milestones are stale (search-space pollution)
- Top individual findings ranked by `pending × 2 + age_days + 365-bonus-if-never-started`
- Action: archive via `/close-out-audit` or revive via `/pick-unit`

### Cold scripts
- Headline `p2` when > 30% of scripts in `scripts/` are cold
- Per-script `p3` rows ranked by age × LOC proxy
- Action: archive or wire (don't delete — `feedback_never_delete_only_disable`)

### Orphan helpers
- Headline `p2` when > 100 orphan helpers (load+resolve overhead)
- Action: either wire into a hook or move under `_archived/`

## Adding a new sub-tool

Each sub-tool needs:
1. A `scripts/<name>.mjs` that supports `--json`
2. An `extract<Name>(payload)` function in `dev-tool-leverage-rank.mjs` that returns the uniform `{tool, status, findings: [{id, label, severity, score, detail}]}` envelope
3. Registration in the `SUB_TOOLS` constant

## Companion tools

- `/hook-fire-rank` — empirical hook fire-rate (shipped same session, not in the aggregator's SUB_TOOLS yet — call directly: `node H:/prism/scripts/hook-fire-rank.mjs`)
- `/system-viz` — graph-aware leverage finder for engines + dispatchers

## Notes

- Sub-tools are spawned in parallel via `spawnSync` (30s timeout each). Total wall clock typically < 5s.
- Schema-tolerant extractors: both this-session's `totals.{x,y}` shape AND peer-shipped `summary.{x,y}` shape are accepted.
- Tests: `node --test scripts/dev-tool-leverage-rank.test.mjs` (39/39 PASS)
- Wiki: closes AUDIT-DEV-TOOLS-PIPELINES-2026-05-16 F3 (4/6 → 5/6 with the named slot; F1+F4 surfaced empirically via synergy + hook-fire-rank).

## Karpathy R10 — checkpoint after invoking

When this command surfaces a P0/P1 finding, restate: which tool fired, what the score was, and what action you're taking. Don't fire-and-forget.
