# TOKEN-SAVINGS-EXPAND/U-DISCOVERY-SPEC — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-EXPAND]/U-DISCOVERY-SPEC (slot:alpha): commit the ultracode discovery deliverable + correct the #3 finding

**Commit:** `a3e6d3ca975c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T23:36:33-05:00
**Tags:** token-savings-expand, u-discovery-spec, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-EXPAND]/U-DISCOVERY-SPEC (slot:alpha): commit the ultracode discovery deliverable + correct the #3 finding

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-EXPAND]/U-DISCOVERY-SPEC (slot:alpha): commit the ultracode discovery deliverable + correct the #3 finding

The HIGHVALUE-DISCOVERY ranked queue (ultracode wi5silr6x) — the /goal req-5
deliverable. Corrects item #3: ollama-route is ALREADY mode:auto (since 2026-05-22,
resident model 2026-06-04); the discovery agent read the wrong path. '592 kept' is
the intentional conservative isGistSafe allowlist, not suggest-mode. No config change.
Items #1 (8-injector dedup) + #2 (MEMORY_SEED reader) shipped this session.
```

## Files touched (5)
- .claude/scripts/tribal-embed-index.mjs      | 112 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++------------------------------------
- .claude/scripts/tribal-embed-index.test.mjs |  85 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/load-tribal-index.mjs           |  18 +++++++++++++++---
- scripts/lib/load-tribal-index.test.mjs      |  23 +++++++++++++++++++++++
- 4 files changed, 199 insertions(+), 39 deletions(-)

## Lessons surfaced in commit body
- wrong path. '592 kept' is

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a3e6d3ca975c`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-EXPAND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._