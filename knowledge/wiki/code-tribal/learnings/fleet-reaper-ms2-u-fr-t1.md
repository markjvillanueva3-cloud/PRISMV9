# FLEET-REAPER-MS2/U-FR-T1 — [MAIN] [FLEET-REAPER-MS2]/U-FR-T1+T2: phantom-advise filter + stale-crash caveat collapse

**Commit:** `f5906d3fa876` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T10:15:28-05:00
**Tags:** fleet-reaper-ms2, u-fr-t1, auto-distilled

## Subject
[MAIN] [FLEET-REAPER-MS2]/U-FR-T1+T2: phantom-advise filter + stale-crash caveat collapse

## Body
```
[MAIN] [FLEET-REAPER-MS2]/U-FR-T1+T2: phantom-advise filter + stale-crash caveat collapse

Both bugs were observed in the LIVE Monitor event 2026-05-18T14:53:07 on
MARKV (commit 91.9% critical):

  service relief ADVISED (critical): postgres, prometheus — service down
  CHAT CRASH DETECTED: slot alpha (claude-689b3203) — heartbeat frozen 71m
  CHAT CRASH DETECTED: slot bravo (claude-9033b60c) — heartbeat frozen 11m
  ... 9 more

But this box has NO postgres or prometheus containers (docker ps -a only
shows qdrant + ollama + nim), and the 11 stale CHAT CRASH lines were
gate-blocked at window-PID-alive (manual reclaim needed, not actionable
by the reaper) — pure log spam.

## U-FR-T1: phantom service-restart filter

serviceRestartAction now accepts an `existingContainers` param (the
result of a `docker ps -a` enumeration). When the array is supplied,
down-flagged services NOT in the existing container set are filtered
from the advise/restart targets. When `null` or undefined, no filter
(pre-T1 fail-soft preserved).

API design — OPT-IN at the boundary:
  - serviceRestartAction (pure):      `existingContainers` defaults to
                                       undefined → no filter
  - restartWedgedServices (shell):    `getExistingContainers` defaults
                                       to null → no probe → no filter
  - Production CLI runSweep():        explicitly wires
                                       `getExistingContainers: opts.getExistingContainers
                                       || defaultGetExistingContainers`

This makes hermetic tests automatically preserve pre-T1 behavior (they
don't inject the probe → no filter → backward-compat). The 19-case
fleet-reaper-service-restart.test.mjs suite is byte-identical-pass
(verified — all 19 green after T1 lands).

defaultGetExistingContainers runs `docker ps -a --format '{{.Names}}'`
with PROBE_TIMEOUT_MS. Returns array on success, null on any failure
(timeout, CLI missing, etc.) — the pure decision function treats null
as "couldn't tell" → reverts to pre-T1 advisory behavior. Fail-soft.

## U-FR-T2: stale-crash caveat collapse

The crash-watch block in runSweep used to emit ONE caveat per crashed
slot — N stale slots = N identical-shape lines every 5-min sweep. At
12 chats × 24h that's thousands of redundant entries.

Now: 0 crashes → no caveat; 1 crash → original format preserved
(backward-compat); 2+ crashes → ONE rolled-up caveat listing every
slot/chatId/frozen-time inline, plus a trailing diagnostic noting
postmortems are written and reclaim needs manual confirmation that
window-pid is also dead.

Per-slot detail is fully preserved in state/shared/chat-crash-postmortems.jsonl.

## Tests

New: scripts/__tests__/fleet-reaper-phantom-advise.test.mjs — 18 cases
covering:
  - existingContainers undefined/null/empty/partial/full
  - docker-daemon-down branch ALSO filters collateral
  - restartEnabled path filtered to deployed
  - probe-flagged-but-none-deployed → noop with diagnostic reason
  - restartWedgedServices forwarding (4 cases — happy + fail-soft + null
    + throws-bubbles-out contract)
  - caveat format pinning (5 cases — 0/1/2/11 crashes + rounding edge)
  - indirect service-name regression guard (postgres/qdrant/prometheus
    recognized; unknown service ignored)

Regression: 152/152 across all 6 reaper test suites:
  fleet-reaper-tier (16) + ballast (20) + service-restart (19) + hunt (27)
  + soft-relief-v2 (X) + host-filter (12) + enum-cache (56) + this (18)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .../__tests__/fleet-reaper-phantom-advise.test.mjs | 308 +++++++++++++++++++++
- scripts/fleet-reaper-sweep.mjs                     |  92 +++++-
- 2 files changed, 394 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f5906d3fa876`
- Milestone envelope: `mcp-server/data/milestones/FLEET-REAPER-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._