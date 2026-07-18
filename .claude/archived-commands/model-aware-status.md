---
description: Check model-aware self-awareness state — current model, context zone, brief cadence
allowed-tools: mcp__prism__prism_dev
---

# Model-Aware Status

Reports the active Claude model, current context zone (fresh/warm/degrading/critical),
and the brief cadence that should apply.

**Why model-aware:** Opus 4.7 1M degrades severely past ~200k tokens (per
GitHub issue anthropic/claude-code#34685, "Lost in the Middle" — Liu et al. 2023).
The reorientation system fires more aggressively as we approach 400k.
For Sonnet 4.6 / Opus 4.5 / Opus 4.6 / Haiku 4.5 (200k native), intensive
reorientation is OFF — compaction handles native limits.

## Usage
- `/model-aware-status` — full report (model, zone, cadence)
- `/model-aware-status detect` — just model detection
- `/model-aware-status cadence <zone>` — show cadence for a specific zone

## Actions
- `prism_dev:model_aware_detect` — model + tier + intensive flag
- `prism_dev:model_aware_zone` — zone for given consumed tokens
- `prism_dev:model_aware_current_cadence` — current cadence (returns null if not 1M)

## Zones (4.7 1M only)
| Zone | Tokens | Brief cadence | Brief size |
|---|---|---|---|
| Fresh | 0–150k | every 20 prompts | 400 tokens |
| Warm | 150k–250k | every 15 prompts | 600 tokens |
| Degrading | 250k–400k | every 8 prompts | 1000 tok + force objective re-anchor |
| Critical | 400k+ | every 4 prompts | 1500 tok + recommend /handoff |

## Detection sources (in order)
1. `CLAUDE_MODEL` env var
2. `ANTHROPIC_MODEL` env var
3. `.claude/settings.json` model field
4. Default: unknown (intensive features OFF for safety)
