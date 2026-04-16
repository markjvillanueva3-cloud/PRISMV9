# Outcome — Log Shop Run Result for PRISM Learning Loop

Record the real-world result of a PRISM-produced CNC program. This is the truthful signal that feeds U-LLM6 LoRA training — without it, the local model trains on self-play instead of shop reality.

## Args: $ARGUMENTS
- `<programId> <outcome>`: minimum — outcome is one of `good`, `scrap`, `adjusted`, `aborted`
- `--machine=<id>`: machine that ran it (e.g., `okuma-lathe-3`)
- `--material=<id>`: material tag (e.g., `m2-tool-steel`)
- `--tools=<csv>`: tool ids used
- `--operator=<id>`: operator login
- `--notes=<text>`: free-form notes (scrap reason, adjustment rationale)
- `--cycle=<sec>`: actual cycle time
- `--ra=<um>`: surface finish Ra measured
- `--wear=<mm>`: tool wear measured
- `--err=<mm>`: dimensional error
- `--feed-pct=<n>`: feed override applied (adjusted runs)
- `--rpm-pct=<n>`: spindle override applied
- `--doc-pct=<n>`: depth-of-cut adjustment

## Outcome Kinds
| Kind | When | Trains On |
|------|------|-----------|
| `good` | Ran as-programmed, in-tolerance | Yes (primary signal) |
| `adjusted` | Operator tweaked to make it work | Yes (with adjustments as features) |
| `scrap` | Part out-of-tolerance or broken | Counter-example in Python pipeline |
| `aborted` | Stopped mid-run (crash risk, wrong fixture, etc.) | Counter-example, high weight |

## Engines
- `OutcomeTrackingEngine` (U-LLM5) — append-only JSONL at `data/outcomes/outcomes.jsonl`
- `FeedbackCollectorEngine` (U-LLM — wrapper) — thumbsUp/thumbsDown shortcuts

## Dispatcher Call (once wired)
```json
{
  "tool": "prism_local_llm",
  "action": "outcome_log",
  "params": {
    "programId": "okuma-3-JM-2026-04-16-001",
    "outcome": "adjusted",
    "machineId": "okuma-lt-3",
    "materialId": "m2",
    "adjustments": { "feedRatePct": -10 },
    "notes": "chatter at start, pulled feed back 10%"
  }
}
```

## Shortcuts
- `/outcome <id> good` — thumbs up
- `/outcome <id> scrap --notes="<reason>"` — thumbs down with reason
- `/outcome stats` — dump current goodRate/scrapRate over last 7 days
- `/outcome needs-attention` — list programs with ≥2 scraps or ≥3 adjustments

## Why Log Religiously
Shop tribal knowledge dies when it isn't captured. Every run logged is a point the LoRA trainer can fit — 100 runs gets you a baseline, 1000 gets you a shop-specific model.
