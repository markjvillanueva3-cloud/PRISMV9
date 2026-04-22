---
name: team-budget
description: Monitor agent team token budgets, track spending across team runs, flag over-budget teams.
model: haiku
effort: low
allowed-tools: Read, Grep, Glob
---

# Team Budget Monitor

Track and report on agent team token usage and budget compliance.

## Usage

```
/team-budget              — Show all team budget summaries
/team-budget forge        — Show forge-team budget details
/team-budget --alert      — Only show over-budget teams
```

## Data Sources

### Agent Spawn Telemetry
Read `~/.prism/telemetry/agent-spawns.jsonl` — one JSON object per line:
```json
{"timestamp": "...", "agent": "code-archaeologist", "model": "sonnet", "turns": 12, "duration_ms": 45000}
```

### Team Run Telemetry
Read `~/.prism/telemetry/team-runs.jsonl` — one JSON object per line:
```json
{"team": "forge", "timestamp": "...", "steps": 3, "results": [...], "status": "complete"}
```

## Budget Reference

Per-team token budgets (estimated from model pricing):

| Team | Budget (tokens) | Max Turns | Model Mix |
|------|----------------|-----------|-----------|
| forge | 60,000 | 115 | sonnet + sonnet + opus |
| test | 35,000 | 65 | haiku + opus + haiku |
| pipeline | 40,000 | 105 | sonnet + sonnet + haiku |

### Token Estimation Heuristic
Since exact token counts are not logged, estimate from turns and model:
- haiku turn: ~300 tokens avg
- sonnet turn: ~500 tokens avg
- opus turn: ~700 tokens avg

## Analysis Steps

1. **Read telemetry files** — parse JSONL, filter by team name if specified
2. **Aggregate per team**:
   - Total runs
   - Total estimated tokens (turns x model multiplier)
   - Average tokens per run
   - Max tokens in a single run
   - Last run timestamp
3. **Budget check**:
   - Compare average tokens per run against budget
   - Flag if average > 80% of budget (WARNING)
   - Flag if any single run > 100% of budget (OVER-BUDGET)
4. **Trend analysis**:
   - Are token costs increasing over recent runs?
   - Which agent in each team uses the most tokens?

## Output Format

```
TEAM BUDGET REPORT
==================
Generated: {timestamp}

FORGE TEAM                          Budget: 60K tokens
  Runs: 12  |  Avg: 45K  |  Max: 58K  |  Status: OK (75%)
  Per-agent: archaeologist 12K, wirer 20K, reviewer 13K

TEST TEAM                           Budget: 35K tokens
  Runs: 8   |  Avg: 28K  |  Max: 41K  |  Status: WARNING (80%)
  Per-agent: runner 3K, hunter 22K, doc-gen 3K
  Note: regression-hunter (opus) dominates budget

PIPELINE TEAM                       Budget: 40K tokens
  Runs: 5   |  Avg: 32K  |  Max: 39K  |  Status: OK (80%)
  Per-agent: archaeologist 12K, build-doctor 16K, runner 4K

ANOMALIES:
  - test-team run #6 exceeded budget (41K/35K = 117%)
  - forge-team trending +5% per run over last 5 runs
```

If `--alert` flag: only show teams with WARNING or OVER-BUDGET status.
If no telemetry files exist, report "No team telemetry data found. Run /team-dispatch to generate data."
