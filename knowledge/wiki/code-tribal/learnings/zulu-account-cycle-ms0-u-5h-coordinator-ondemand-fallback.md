# ZULU-ACCOUNT-CYCLE-MS0/U-5H-COORDINATOR-ONDEMAND-FALLBACK — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ZULU-ACCOUNT-CYCLE-MS0]/U-5H-COORDINATOR-ONDEMAND-FALLBACK: keystone #4 -- on-demand 5h fallback closes the C5 chokepoint (switch now self-sufficient)

**Commit:** `ac8cc4e7c893` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T11:23:11-05:00
**Tags:** zulu-account-cycle-ms0, u-5h-coordinator-ondemand-fallback, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ZULU-ACCOUNT-CYCLE-MS0]/U-5H-COORDINATOR-ONDEMAND-FALLBACK: keystone #4 -- on-demand 5h fallback closes the C5 chokepoint (switch now self-sufficient)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ZULU-ACCOUNT-CYCLE-MS0]/U-5H-COORDINATOR-ONDEMAND-FALLBACK: keystone #4 -- on-demand 5h fallback closes the C5 chokepoint (switch now self-sufficient)

Fleet-shared main asset (same file + same bootstrap-escape as a5b65b8711). The
5h-quota keystone's final piece. The coordinator reads quota.fiveHour from
token-budget-<slot>.json sidecars, but this host NEVER emits rate_limits.five_hour
so the live token-awareness hook never wrote that field -> readFiveHourPct always
returned null -> decideSwitch undecidable -> the auto-account-switch chain stayed
dark even though keystones #1-3 (sum/populate/gate) were all shipped.

DESIGN PIVOT (R7, diverged from the handoff's Option A with reason): the handoff
committed to integrating the sum INTO token-awareness-sidecar.mjs (the live hook).
That hook fires on every UserPromptSubmit + PostToolUse x25 chats -- coupling an
O(all-transcripts) scan to the hottest hook in the fleet is a real latency + blast-
radius risk. The coordinator is the SOLE consumer of the 5h-quota and is NOT
latency-sensitive (background switch-decider). Option C dissolves the two-writers
problem instead of working around it: compute the host-wide rolling-5h weighted sum
ON-DEMAND inside readFiveHourPct when no sidecar carries a usable value. No hook
edit, no new file, no scheduled task, no clobber, always fresh. The display-banner
integration (the only thing Option A added) becomes a separate lower-priority #4b.

  - new export fiveHourFallbackFromTranscripts({nowMs,env,_sum}) -> {pct,weighted,
    source,meteredTokens}; calls fiveHourTokenSum; pct from PRISM_5H_WEIGHTED_BUDGET/
    PRISM_5H_TOKEN_BUDGET else null (no fabricated denominator -- keystone #3's
    absolute weighted trigger handles the denominator-free case). fail-soft -> null.
  - readFiveHourPct falls back ONLY when best===null && bestWeighted===null, GATED on
    (opts._sum || opts.fallbackLive) + env kill-switch PRISM_5H_ONDEMAND_FALLBACK!=0.
    Zero-regression by construction: every existing test calls without _sum/fallbackLive
    so legacy behavior is byte-identical; main() passes fallbackLive:true for the live CLI.
  - sidecar-first preserved: a real rate_limits-based pct, if it ever appears, wins.
  - undecidable error now surfaces the live weighted figure (actionable: the real
    number to calibrate PRISM_5H_WEIGHTED_TOKEN_TRIGGER against).

Number(null)===0 trap hit AGAIN (4th time in this surface) and caught by review+tests:
fixed 3 guards to reject == null before Number.isFinite(Number(x)) while still
accepting a real finite 0 -- the helper weighted guard, the sidecar weightedTokens
read (P1, parity with the pct guard), and the error-message wLive (P2).

VALIDATION: 67/67 tests (55 original zero-regression + 12 new: helper unit, readFiveHourPct
fallback, runCoordinator integration through the REAL readFiveHourPct, + a P1 regression
lock). Live E2E through the full coordinator: weighted=121.9M computed on-demand from real
transcripts -> fail-loud FIVE_HOUR_SOURCE_UNAVAILABLE with the live figure in the message.
2-agent scrutiny: both PASS, P1+P2 fixed before commit.

Also cleaned (runtime state, not in this commit): 9 sidecars carried a stale pct=1
false-trigger from zulu's SUPERSEDED populate-5h-quota.mjs (hardcoded-88M-ceiling bug,
single 04:24 run) -- the exact failure mode documented as superseded. Stripped so the
armed coordinator can't mis-switch on stale data.

INERT by default: no scheduled task, dry-run default, no operator-set trigger -> no
switch fires. Honors bravo soul unsafe-fleet-control-before-governance.
```

## Files touched (3)
- scripts/account-switch-restart-coordinator.mjs      |  91 +++++++++++++++++++++++++++++++++++++++++++--
- scripts/account-switch-restart-coordinator.test.mjs | 159 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 245 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- till

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ac8cc4e7c893`
- Milestone envelope: `mcp-server/data/milestones/ZULU-ACCOUNT-CYCLE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._