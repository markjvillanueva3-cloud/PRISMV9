# HERMES-BRIDGE-MS0/U-HERMES-UTIL-TRACK — [MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-HERMES-UTIL-TRACK (slot:echo): track ask-hermes utilization in offload-stats byHook["ask-hermes"]

**Commit:** `b56ef64c7ecf` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T19:46:57-05:00
**Tags:** hermes-bridge-ms0, u-hermes-util-track, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-HERMES-UTIL-TRACK (slot:echo): track ask-hermes utilization in offload-stats byHook["ask-hermes"]

## Body
```
[MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-HERMES-UTIL-TRACK (slot:echo): track ask-hermes utilization in offload-stats byHook["ask-hermes"]

Hermes was bridged but UNMEASURED -- byHook["ask-hermes"] was ABSENT from the
offload dashboard, so the "is Hermes utilized?" question had no data. Add a pure
tallyUsage() (exported, 6 new tests) + a fail-safe atomic recordUsage() wired
into all 4 ask-hermes exit points (hermes-ok / ollama-fallback / no-fallback-fail
/ both-fail). bySource splits real Hermes use from "Hermes failed, Ollama saved
it" so utilization is honestly attributable. Never creates a parallel stats file
(only annotates the canonical one); never throws (telemetry must not break the CLI).
26/26 tests; LIVE: byHook ABSENT -> {fired:1,offloaded:1,bySource:{hermes:1}} via grok.
```

## Files touched (3)
- scripts/ask-hermes.mjs      | 60 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- scripts/ask-hermes.test.mjs | 59 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 118 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- TIL-TRACK (slot:echo): track ask-hermes utilization in offload-stats byHook["ask-hermes"]
- tilized?" question had no data. Add a pure
- tilization is honestly attributable. Never creates a parallel stats file

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b56ef64c7ecf`
- Milestone envelope: `mcp-server/data/milestones/HERMES-BRIDGE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._