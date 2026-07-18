# FLEET-SEARCH-DAEMON-MS0/U-DAEMON-SELFHEAL — [MAIN-FORCE] [FLEET-SEARCH-DAEMON-MS0]/U-DAEMON-SELFHEAL: daemon self-heal guardian (no elevation) + settings wiring

**Commit:** `00c582525578` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T19:55:58-05:00
**Tags:** fleet-search-daemon-ms0, u-daemon-selfheal, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-SEARCH-DAEMON-MS0]/U-DAEMON-SELFHEAL: daemon self-heal guardian (no elevation) + settings wiring

## Body
```
[MAIN-FORCE] [FLEET-SEARCH-DAEMON-MS0]/U-DAEMON-SELFHEAL: daemon self-heal guardian (no elevation) + settings wiring

ensure-index-daemon-guardian.mjs (.claude/hooks/) -- fleet-wide SessionStart +
UserPromptSubmit guardian that probes :3101/health and, if the warm search
daemon is down, spawns it detached (process.execPath + --max-old-space-size=2048,
detached/stdio:ignore/windowsHide, unref). The daemon's own EADDRINUSE-exit-0
guard makes a double-spawn harmless, so any chat can ensure it -- 26 chats
collectively keep it up across any one chat's /compact. NO operator elevation
needed (vs the SYSTEM scheduled task). Advisory-only, fail-soft, 60s UserPromptSubmit
probe throttle. Kill switches: PRISM_INDEX_DAEMON_GUARDIAN_DISABLE / _DISABLE.
Modeled on golf-slot-reaper-guardian (same stdin-drain/emit/spawn-detached idiom).

Verified all 4 branches: healthy->silent, kill-switch->off, throttle->no-op,
down->detected+spawned (pid killed, 59994 left clean, real daemon 3101 intact).

wire-index-daemon-guardian-settings.mjs -- idempotent JSON-validated patcher that
wired the guardian into SessionStart (after the autostart cluster) + UserPromptSubmit
(after session-id-pin) in both C:/ and H:/ settings.json (--dry/--revert; backups).

This completes task #8 activation WITHOUT operator elevation; the SYSTEM scheduled
task (install-index-daemon-task.ps1) remains the optional reboot-durable layer.
```

## Files touched (3)
- .claude/hooks/ensure-index-daemon-guardian.mjs  | 175 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/wire-index-daemon-guardian-settings.mjs |  94 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 269 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 00c582525578`
- Milestone envelope: `mcp-server/data/milestones/FLEET-SEARCH-DAEMON-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._