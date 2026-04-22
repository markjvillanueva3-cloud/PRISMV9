---
name: adaptive-optimize
description: "Run PRISM adaptive optimization -- ML-based auto-tuning of model routing, effort levels, agent turns, token budgets, hook priorities, and cron frequencies."
model: sonnet
effort: medium
argument-hint: "[full|model|effort|turns|budget|hooks|cost|dedup|retry|skill|ab-create|ab-eval|context|cron]"
---

# Adaptive Optimize Skill

Run the adaptive optimizer engine to auto-tune system parameters based on collected telemetry and coordination stats.

## Usage

```
/adaptive-optimize           # Full optimization report (all subsystems)
/adaptive-optimize model 7   # Predict optimal model for complexity=7
/adaptive-optimize effort    # Predict effort level
/adaptive-optimize turns     # Optimize agent maxTurns
/adaptive-optimize budget    # Predict token budget
/adaptive-optimize hooks     # Rank hook priorities
/adaptive-optimize cost      # Cost-per-outcome analysis
/adaptive-optimize dedup     # Optimize dedup windows
/adaptive-optimize retry     # Optimize retry strategy
/adaptive-optimize skill X   # Optimize skill model tier
/adaptive-optimize ab-create <name> <param> <control> <treatment>
/adaptive-optimize ab-eval <name>
/adaptive-optimize context   # Predict session context (warm-start)
/adaptive-optimize cron X    # Optimize cron frequency
```

## Instructions

1. Run the adaptive optimizer engine:
   ```bash
   python3 "C:/Users/Admin.DIGITALSTORM-PC/.claude/hooks/lib/adaptive_optimizer.py" <arg>
   ```

2. Parse the JSON output and display results as actionable recommendations.

3. For the full report, summarize each subsystem recommendation in a table:
   - Model routing: recommended tier + confidence
   - Effort routing: recommended level + latency data
   - Max turns: recommended value + P95 basis
   - Token budget: predicted cost + confidence level
   - Hook priorities: top 5 + skip candidates
   - Cost optimization: cheapest viable model
   - Dedup windows: any recommended adjustments
   - Retry strategy: optimal max retries per action

4. For A/B tests, show control vs treatment with statistical significance (Welch t-test, p<0.05).

5. Highlight any parameters that should be changed from current defaults.
