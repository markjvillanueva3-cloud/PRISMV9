# HERMES-BRIDGE-MS0/U-PROXY-ENSURE — [MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-PROXY-ENSURE: idempotent Hermes proxy keepalive + scheduled-task installer

**Commit:** `959d42496af7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T14:31:26-05:00
**Tags:** hermes-bridge-ms0, u-proxy-ensure, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-PROXY-ENSURE: idempotent Hermes proxy keepalive + scheduled-task installer

## Body
```
[MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-PROXY-ENSURE: idempotent Hermes proxy keepalive + scheduled-task installer

Closes the one operational gap from U-ASK-HERMES: the proxy was not a service, so
ask-hermes silently degraded to ollama whenever no one had run 'hermes proxy start'.

scripts/hermes-proxy-ensure.mjs: idempotent -- probes :8645/v1, and only if down
spawns 'hermes proxy start' DETACHED (survives this process; not a leaked child).
12/12 unit tests. .claude/helpers/install-hermes-proxy-task.ps1: registers
'PRISM Hermes Proxy' scheduled task (S4U current-user -- user-scoped OAuth creds;
NOT SYSTEM), every 5 min + AtStartup, clone of the fleet-reaper installer convention.

LIVE E2E: ensure (down) -> started detached ready@2s -> ask-hermes returned
'PRISM_ENSURE_OK' via grok -> re-run reported already-up (idempotent) -> cleaned up.
Install (elevated): & H:/PRISM/.claude/helpers/install-hermes-proxy-task.ps1 -RunNow
```

## Files touched (4)
- .claude/helpers/install-hermes-proxy-task.ps1 | 114 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/hermes-proxy-ensure.mjs               | 136 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/hermes-proxy-ensure.test.mjs          | 102 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 352 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 959d42496af7`
- Milestone envelope: `mcp-server/data/milestones/HERMES-BRIDGE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._