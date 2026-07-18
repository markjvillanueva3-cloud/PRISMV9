# HZP-DASH-MS0/U-HZD-SCRUTINY-P1-FIX — [MAIN] [HZP-DASH-MS0]/U-HZD-SCRUTINY-P1-FIX (slot:bravo): 3 P1 follow-ups from triple-scrutiny — fail-closed regex + body-size + UUID validation + tab-title prefix

**Commit:** `2c6ae50eced1` · **By:** markjvillanueva3-cloud · **At:** 2026-05-25T01:46:04-05:00
**Tags:** hzp-dash-ms0, u-hzd-scrutiny-p1-fix, auto-distilled

## Subject
[MAIN] [HZP-DASH-MS0]/U-HZD-SCRUTINY-P1-FIX (slot:bravo): 3 P1 follow-ups from triple-scrutiny — fail-closed regex + body-size + UUID validation + tab-title prefix

## Body
```
[MAIN] [HZP-DASH-MS0]/U-HZD-SCRUTINY-P1-FIX (slot:bravo): 3 P1 follow-ups from triple-scrutiny — fail-closed regex + body-size + UUID validation + tab-title prefix

Three parallel scrutiny agents reviewed the HZP-DASH-MS0 landing.
Verdicts: 1 PASS, 2 FAIL with 4 P1 findings worth same-day fix.

P1 #1 — Malformed regex in domain_filter silently fell through to orchestrator
rule, granting authority to any orchestrator-roled slot whose author had a YAML
typo. Now fails-CLOSED with reason="domain-filter-malformed:<pattern>" so the
audit log captures the YAML defect.
  Files: ZuluFleetGovernorEngine.ts + hzp-dash-control-server.mjs (inline mirror)
  Test:  +1 case orchestrator+badRegex => REJECT. 25/25 pass (was 24/24).

P1 #2 — Body-size limit had off-by-one (accepted one over-size chunk before
rejecting). Check moved BEFORE chunk push.
  File:  hzp-dash-control-server.mjs readJsonBody

P1 #3 — Filename-based shell-injection vector: regenerate-launch-fleet.mjs
embedded sessionUuid and slot names from chat-slots.json + filesystem readdir
into wt.exe quoted args. A maliciously-named .jsonl in the projects dir could
close the quoted arg and inject extra commands. Now sessionUuid validates
strictly against the v4 UUID regex and slot names against ^[a-z][a-z0-9_-]{0,32}$
— anything weirdly-named is filtered before .bat generation.

P1 #4 — Tab-title collision broke snap-wt-quadrants.ps1 reliability: clicking
a tab changed the wt window caption to that tab's title, dropping the
"prism-NW" substring the snap regex requires. Every tab title now carries the
"prism-<QUAD>-" prefix so the window caption always matches the snap key
regardless of which tab is focused.

Live smoke after restart of control server on :8767:
  POST /api/fleet/assign bravo "compute kienzle force"
  -> {"ok":true,"audit_id":"hzpd-mpku2it7-71f2ba","reason":"domain-match:..."}

Regenerated .bat verified: every tab title matches prism-(NW|NE|SW|SE)-*.

Deferred to next iteration:
  P1 audit-before-mutation phantom-success records (needs begin/commit pattern)
  P1 race on slot-task-claims.json RMW (needs lockfile via slot-task-claim.mjs)
  P1 frontmatter parser drops unknown keys (canonical reader is authoritative)
  P2 refuse-list word-boundary match
  P2 per-route timeouts (5s sufficient today)
  P2 ORCHESTRATOR_ROLES hardcoded set
```

## Files touched (5)
- .../src/__tests__/ZuluFleetGovernorEngine.test.ts | 15 ++++++++--
- mcp-server/src/engines/ZuluFleetGovernorEngine.ts | 17 +++++++++--
- scripts/hzp-dash-control-server.mjs                | 12 ++++++--
- scripts/regenerate-launch-fleet.mjs                | 35 +++++++++++++++-------
- 4 files changed, 60 insertions(+), 19 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2c6ae50eced1`
- Milestone envelope: `mcp-server/data/milestones/HZP-DASH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._