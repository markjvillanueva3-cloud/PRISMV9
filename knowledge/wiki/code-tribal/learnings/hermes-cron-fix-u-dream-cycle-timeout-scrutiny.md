# HERMES-CRON-FIX/U-DREAM-CYCLE-TIMEOUT-SCRUTINY — [MAIN-FORCE] [HERMES-CRON-FIX]/U-DREAM-CYCLE-TIMEOUT-SCRUTINY (slot:bravo): close 3-of-3 findings -- P1 isolate the ETIMEDOUT clause in tests + P2 coerce non-positive timeoutMs (timeout:0=unbounded footgun) + P2 reconcile installer/live --llm-synth drift (arm C: live ran BARE, historical 267014 overran on corpus+cascade alone; live now --llm-synth, Ollama up). 42/42 tests. R12 precision in assessment.

**Commit:** `fab697ba78f5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T19:02:39-05:00
**Tags:** hermes-cron-fix, u-dream-cycle-timeout-scrutiny, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-CRON-FIX]/U-DREAM-CYCLE-TIMEOUT-SCRUTINY (slot:bravo): close 3-of-3 findings -- P1 isolate the ETIMEDOUT clause in tests + P2 coerce non-positive timeoutMs (timeout:0=unbounded footgun) + P2 reconcile installer/live --llm-synth drift (arm C: live ran BARE, historical 267014 overran on corpus+cascade alone; live now --llm-synth, Ollama up). 42/42 tests. R12 precision in assessment.

## Body
```
[MAIN-FORCE] [HERMES-CRON-FIX]/U-DREAM-CYCLE-TIMEOUT-SCRUTINY (slot:bravo): close 3-of-3 findings -- P1 isolate the ETIMEDOUT clause in tests + P2 coerce non-positive timeoutMs (timeout:0=unbounded footgun) + P2 reconcile installer/live --llm-synth drift (arm C: live ran BARE, historical 267014 overran on corpus+cascade alone; live now --llm-synth, Ollama up). 42/42 tests. R12 precision in assessment.
```

## Files touched (5)
- scripts/hermes-dream-cycle-synth.mjs                    |  8 +++++++-
- scripts/hermes-dream-cycle-synth.test.mjs               | 25 +++++++++++++++++++++++++
- scripts/lib/fleet-reaper-crash-watch.mjs                | 17 ++++++++++++++---
- state/shared/specs/HERMES-FULL-ASSESSMENT-2026-06-17.md |  3 ++-
- 4 files changed, 48 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fab697ba78f5`
- Milestone envelope: `mcp-server/data/milestones/HERMES-CRON-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._