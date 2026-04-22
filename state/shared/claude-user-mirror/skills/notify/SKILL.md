---
name: notify
description: >
  Send PRISM notifications to messaging platforms. Covers build
  failures, test regressions, catalog updates, cron results,
  machine alarms, tool wear alerts.
model: haiku
effort: low
argument-hint: "[build|test|catalog|cron|alarm|wear] <message>"
---

# Notify Skill

Send formatted notifications from PRISM to messaging platforms.

## Usage

- `/notify build "Build failed: 3 TS errors"`
- `/notify test "5 regressions in forge-engines-3"`
- `/notify catalog "Seco catalog updated: +128 entries"`
- `/notify cron "Nightly audit: 99.2% coverage"`
- `/notify alarm "Fanuc 1001: Overtravel on X axis"`
- `/notify wear "Tool T12 at 92% wear"`

## Steps

1. Parse notification type from first argument.

2. Format as messaging embed using the webhook receiver:
   - build: Red embed, high priority
   - test: Red embed, high priority
   - catalog: Blue embed, low priority
   - cron: Gray embed, low priority
   - alarm: Red/amber embed, critical priority
   - wear: Amber embed, high priority

3. POST to webhook at http://localhost:18362/webhook with JSON:
   source = type, type = notification,
   payload = { message, timestamp }, priority = mapped level.

4. If webhook server is not running, fall back to console.

## Priority Mapping

| Type | Color | Priority | Forward |
|------|-------|----------|---------|
| build | Red | high | Always |
| test | Red | high | Always |
| alarm | Red | critical | Always |
| wear | Amber | high | If enabled |
| catalog | Blue | low | If enabled |
| cron | Gray | low | If enabled |

## Notification Config

Controlled via BOT_CONFIG.notifications in bot-config.ts:
- buildFailures: true (always forward)
- testRegressions: true (always forward)
- alarmAlerts: true (always forward)
- wearAlerts: true (forward if enabled)
- catalogUpdates: false (opt-in)
- cronResults: false (opt-in)
