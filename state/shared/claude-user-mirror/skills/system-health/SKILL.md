---
name: system-health
description: Generate PRISM system health report from telemetry data — tool failures, agent performance, cron reliability, review metrics, context pressure.
model: haiku
effort: low
allowed-tools: Read, Bash
argument-hint: "[report|size|prune]"
---

# System Health Report

Run the telemetry analyzer to generate the requested report type.

## Steps

1. Determine the command from the user argument (default: report). Valid commands: report, size, prune.
2. Run the analyzer:
   ```bash
   python3 ~/.claude/hooks/lib/telemetry_analyzer.py <command>
   ```
3. Parse the JSON output and format it as a readable summary:
   - **report**: Show each section (tool failures, agent spawns, sessions, compactions, stop failures, cron reliability, code reviews) with counts and breakdowns.
   - **size**: Show total telemetry size in MB.
   - **prune**: Show how many old entries were removed.
4. For the report command, highlight any anomalies:
   - Tool failure rate > 5% of total tool calls
   - Cron success rate < 95%
   - Agent completion rate < 80%
   - Review precision < 90%
