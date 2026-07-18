# FLEET-PHD-BUILDOUT - Campaign Continuity Dashboard

> Generated 2026-06-27T20:04:11.623Z by `scripts/fleet-phd-continuity.mjs` (read-only observer).
> Task-health probe: live.

**Summary:** advancing 10 | stalled 5 | blocked 0 | done 1 (of 16)

## Operator repairs (one-time)
- operator: re-kick "PRISM CAD Gen Loop" (Start-ScheduledTask, or install-fleet-phd-continuity-task.ps1 -RekickStale)

## Stale continuity loops
- **PRISM CAD Gen Loop** = stale (last run 2026-06-26T14:34:34.0000000Z)

## Per-domain

| Slot | Galaxy | Status | Plan | Task / health | Commits 72h | Next action |
|------|--------|--------|------|---------------|-------------|-------------|
| charlie | quoting | advancing | draft | PRISM Galaxy Mine (quoting) / healthy | 0 | advance mape toward <= 25% |
| delta | cad | advancing | draft | PRISM CAD Gen Loop / stale | 1 | advance tribal_tips toward >= 400 |
| echo | post-processor | stalled:cron-dead | draft | PRISM Galaxy Mine (post-processor) / spec-only | 0 | re-kick/register deepening task "PRISM Galaxy Mine (post-processor)" (Start-ScheduledTask or its install .ps1) |
| foxtrot | mill | advancing | draft | PRISM Galaxy Mine (mill) / healthy | 0 | advance auroc toward >= 0.78 |
| hotel | business | advancing | draft | PRISM Galaxy Mine (business) / healthy | 1 | advance tribal_tip toward >= 60 |
| india | ai-training | advancing | draft | PRISM NN-Graph Retrain / healthy | 0 | advance reward toward < 0.7 |
| kilo | cam | advancing | draft | PRISM CAM Tool Library Regen / healthy | 0 | advance tribal toward >= 150 |
| lima | academy | done | final | PRISM Galaxy Mine (academy) / healthy | 0 | deepening steady-state; monitor only |
| mike | wedm | stalled:cron-dead | draft | PRISM Galaxy Mine (wedm) / spec-only | 0 | re-kick/register deepening task "PRISM Galaxy Mine (wedm)" (Start-ScheduledTask or its install .ps1) |
| oscar | speed-feed | advancing | draft | PRISM SFC Variability Batch Mill / healthy | 0 | advance tribal toward >= 100tips |
| quebec | frontend-app | stalled:cron-dead | draft | PRISM Galaxy Mine (frontend-app) / spec-only | 0 | re-kick/register deepening task "PRISM Galaxy Mine (frontend-app)" (Start-ScheduledTask or its install .ps1) |
| romeo | wiring | advancing | draft | PRISM Galaxy Mine (wiring) / healthy | 0 | run /checkin-romeo /loop on DOMAIN-PLAN-romeo section 3 |
| sierra | system-viz | stalled:cron-dead | draft | PRISM Galaxy Mine (system-viz) / spec-only | 0 | re-kick/register deepening task "PRISM Galaxy Mine (system-viz)" (Start-ScheduledTask or its install .ps1) |
| whiskey | lathe | advancing | draft | PRISM Galaxy Mine (lathe) / healthy | 1 | advance tribal_tip toward >= 80 |
| xray | blueprint-vision | advancing | draft | PRISM OCR Training Loop / healthy | 10 | advance tribal_tips toward >= 100 |
| zulu | hermes-zulu | stalled:cron-dead | draft | PRISM Galaxy Mine (hermes-zulu) / spec-only | 0 | re-kick/register deepening task "PRISM Galaxy Mine (hermes-zulu)" (Start-ScheduledTask or its install .ps1) |

_Disable chat-bus posts: `--no-chatbus`. Knobs: `PRISM_PHD_STALL_*`, `PRISM_PHD_CADENCE_HRS`, `PRISM_PHD_CHATBUS_THROTTLE_HRS`._
