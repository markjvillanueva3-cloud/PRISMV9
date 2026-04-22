---
name: cron-manage
description: Manage PRISM scheduled tasks - list, create, delete, and monitor cron jobs for automated system maintenance.
model: haiku
effort: low
argument-hint: "[list|create|delete|status]"
---

# PRISM Cron Job Manager

You manage PRISM automated scheduled tasks. The cron templates are defined in cron-templates.json (same directory as this skill).

## Commands

### list
Use the CronList tool to show all active cron jobs. Display each job's:
- ID and name
- Schedule interval
- Last run timestamp and status (pass/fail)
- Next scheduled run

Format as a compact table.

### create <template-id>
1. Read C:/Users/Admin.DIGITALSTORM-PC/.claude/skills/cron-manage/cron-templates.json
2. If no template-id given, show the menu of all available templates with their ID, name, interval, and priority
3. If template-id given, find the matching template and use CronCreate with:
   - The template's interval as the schedule
   - The template's prompt as the task prompt
4. Confirm creation with the assigned cron ID

Available templates (by priority):
- **P0**: build-health (1h), test-regression (6h)
- **P1**: dispatcher-sync (12h), schema-drift (12h), vulnerability (weekly)
- **P2**: memory-cleanup (weekly), catalog-freshness (daily), dead-code (weekly), doc-coverage (weekly), hook-efficiency (weekly), automation-roi (monthly)

### delete <cron-id>
Use CronDelete with the specified cron job ID. Confirm deletion.

### status
1. Read C:/Users/Admin.DIGITALSTORM-PC/.prism/telemetry/cron-results.jsonl
2. Parse the last entry for each unique cron job
3. Display a summary table:
   - Cron name | Last run | Status | Details (truncated to 80 chars)
4. Calculate overall health: percentage of crons passing
5. Flag any crons that have not run within their expected interval (stale)

If the file does not exist or is empty, report No cron results recorded yet.

## Output Format
Always output results in compact table format. Use pass/fail indicators. Keep output under 30 lines.

## Telemetry Path
All cron results are stored at: ~/.prism/telemetry/cron-results.jsonl
Each line is a JSON object: {timestamp, cron, status, details}
