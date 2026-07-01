# OLLAMA-OFFLOAD/U-OFFLOAD-ACTION — [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-OFFLOAD-ACTION (slot:zulu): make offload ADOPTION measurable + make the operator's dead auto-exec knob real.

**Commit:** `8ccf58a8d98c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T10:30:30-05:00
**Tags:** ollama-offload, u-offload-action, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-OFFLOAD-ACTION (slot:zulu): make offload ADOPTION measurable + make the operator's dead auto-exec knob real.

## Body
```
[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-OFFLOAD-ACTION (slot:zulu): make offload ADOPTION measurable + make the operator's dead auto-exec knob real.

- ask-ollama.mjs: runRequest success paths (ask + file modes) attach MEASURED telemetry; main() records an EXECUTED offload event via new recordExecution() (fail-soft dynamic import; PRISM_ASK_OLLAMA_TELEMETRY=0 disables). The dashboard previously counted only directives ISSUED -- actual local executions were invisible.
- scrutiny P1 (both arms): executed events route to SEPARATE totals (executedOffloads/measuredTokensSaved in bumpTotals) + dashboard segments them out of directive counts/rates into a recent adoption sub-metric (executedOffloads/executedTokensSaved/adoptionRate) -- one adopted action can never double-count the headline rate; byCategory kept namespace-clean.
- offloader: SAFE_AUTOEXEC += prism_introspect->explain, search_synthesis->summarize; PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1 (live env, previously read by NO hook -- 2026-06-11 fleet audit) now bypasses the per-category rate limit for SAFE categories only (never widens; never executes in-hook); events carry extras.autoexecKnob.
- Tests 121/121 incl E2E revert-canary spawning the real hook (knob bypasses a fresh rate limit; without knob it suppresses) + executed-segmentation pins. LIVE: summarize run recorded byHook[ask-ollama] tokensSaved=949 matching the measured footer; post-fix ask run routed executedOffloads 1->2 with headline untouched; one-time stats correction moved the single pre-fix event.
- 2-arm per-file scrutiny: P1 fixed both layers; P2s fixed (knob E2E, byCategory). Deferred P3s logged in handoff (ask-mode savings semantics, search_synthesis fit, keep_alive env-dependent sibling pin).
```

## Files touched (8)
- .claude/hooks/__tests__/ollama-task-offloader-autoexec.test.mjs | 72 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---
- .claude/hooks/lib/ollama-stats.mjs                              | 18 ++++++++++++++++-
- .claude/hooks/ollama-task-offloader.mjs                         | 24 ++++++++++++++++++++++-
- scripts/__tests__/ollama-offload-dashboard.test.mjs             | 29 +++++++++++++++++++++++++++
- scripts/ask-ollama.mjs                                          | 37 +++++++++++++++++++++++++++++++---
- scripts/ask-ollama.test.mjs                                     | 72 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- scripts/ollama-offload-dashboard.mjs                            | 23 ++++++++++++++++++++++
- 7 files changed, 266 insertions(+), 9 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8ccf58a8d98c`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._