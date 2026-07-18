# CLOUD-OVERFLOW-MS0/U-OPENROUTER-WIRE-P1 — [MAIN-FORCE] [CLOUD-OVERFLOW-MS0]/U-OPENROUTER-WIRE-P1 (slot:alpha): 3-of-3 scrutiny P1s (2 arms FAIL -> fixed)

**Commit:** `a4269f03c7b5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T12:10:44-05:00
**Tags:** cloud-overflow-ms0, u-openrouter-wire-p1, auto-distilled

## Subject
[MAIN-FORCE] [CLOUD-OVERFLOW-MS0]/U-OPENROUTER-WIRE-P1 (slot:alpha): 3-of-3 scrutiny P1s (2 arms FAIL -> fixed)

## Body
```
[MAIN-FORCE] [CLOUD-OVERFLOW-MS0]/U-OPENROUTER-WIRE-P1 (slot:alpha): 3-of-3 scrutiny P1s (2 arms FAIL -> fixed)

- arm A P1: CLOUD_EXPLICIT bare 'cloud (model|llm|tier)' + '<name> ... model' matched incidental
  TOPIC mentions ('fix the cloud tier handler', 'openrouter model pricing') -> explicit cloud,
  bypassing the veto = quality regression. Now requires a DIRECTIVE verb (use/via/route to/run on/
  ask/switch to). +regression tests (topic-mention -> null; directive verb -> explicit).
- arm C P1: provider-error path returned extractCompletion's error with only pattern-redactKey,
  skipping the literal scrubSecret(apiKey) every other error path uses -> a raw-shaped key echoed
  in a 200 error body would leak. Now scrub()'d. +regression test (raw key in provider error).
- P2 (A+B+C): dropped bare 'research all' (caught shallow 'research all the records'); kept
  'research across/the entire/the whole'. +text-mode NC-guard-asymmetry clarity comment.

91/91 tests (4 new). arm B was PASS.
```

## Files touched (6)
- scripts/ask-openrouter.mjs                |  4 ++++
- scripts/lib/model-routing-policy.mjs      | 16 ++++++++++------
- scripts/lib/model-routing-policy.test.mjs | 19 +++++++++++++++++++
- scripts/lib/openrouter-client.mjs         |  5 ++++-
- scripts/lib/openrouter-client.test.mjs    |  8 ++++++++
- 5 files changed, 45 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a4269f03c7b5`
- Milestone envelope: `mcp-server/data/milestones/CLOUD-OVERFLOW-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._