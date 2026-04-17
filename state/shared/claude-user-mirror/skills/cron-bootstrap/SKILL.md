---
name: cron-bootstrap
description: Register all PRISM automated cron jobs. Run once per fresh session to activate scheduled maintenance.
model: haiku
effort: low
---

# PRISM Cron Bootstrap

Registers all PRISM automated cron jobs from the template definitions. Run this once per fresh session to activate scheduled maintenance tasks.

## Procedure

1. **Check existing crons**: Use CronList to get all currently registered cron jobs.

2. **Load templates**: Read C:/Users/Admin.DIGITALSTORM-PC/.claude/skills/cron-manage/cron-templates.json and parse the templates array.

3. **Deduplicate**: For each template, check if a cron with matching prompt content already exists in the CronList output. Skip any that are already registered to avoid duplicates.

4. **Register by priority**: Register crons in priority order (P0 first, then P1, then P2):

   **P0 -- Critical (register always)**:
   - build-health: every 1 hour
   - test-regression: every 6 hours

   **P1 -- Important (register always)**:
   - dispatcher-sync: every 12 hours
   - schema-drift: every 12 hours
   - vulnerability: weekly

   **P2 -- Maintenance (register always)**:
   - memory-cleanup: weekly
   - catalog-freshness: daily
   - dead-code: weekly
   - doc-coverage: weekly
   - hook-efficiency: weekly
   - automation-roi: monthly

5. **For each template to register**, call CronCreate with:
   - schedule: the template interval value
   - prompt: the template prompt value

6. **Verify**: After all registrations, call CronList one final time to confirm all 11 crons are active.

7. **Report**: Output a summary table:

   PRISM Cron Bootstrap Complete
   =============================
   Registered: X new | Skipped: Y existing | Total active: Z

   ID                | Interval  | Priority | Status
   ------------------|-----------|----------|--------
   build-health      | 1h        | P0       | ACTIVE
   test-regression   | 6h        | P0       | ACTIVE
   ...

## Telemetry Directory
Ensure C:/Users/Admin.DIGITALSTORM-PC/.prism/telemetry/ exists before completing. Create it if missing.

## Error Handling
- If CronCreate fails for a template, log the error and continue with remaining templates
- Report all failures at the end
- Never fail silently -- always report what was registered and what was skipped/failed
