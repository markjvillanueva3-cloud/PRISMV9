# FLEET-REAPER-MS1/U-FR-TIER1-AGGRESSIVE-THRESHOLDS — [MAIN] [FLEET-REAPER-MS1]/U-FR-TIER1-AGGRESSIVE-THRESHOLDS: graduated mem-pressure gate

**Commit:** `f4ab9e01d986` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T12:13:29-05:00
**Tags:** fleet-reaper-ms1, u-fr-tier1-aggressive-thresholds, auto-distilled

## Subject
[MAIN] [FLEET-REAPER-MS1]/U-FR-TIER1-AGGRESSIVE-THRESHOLDS: graduated mem-pressure gate

## Body
```
[MAIN] [FLEET-REAPER-MS1]/U-FR-TIER1-AGGRESSIVE-THRESHOLDS: graduated mem-pressure gate

Replaces the binary `underPressure ? min(killAfter,1) : killAfter` reap gate
with a pure 3-band `tierFromPressure()` helper: <warn=normal (full killAfter),
[warn,critical)=warn (min(killAfter,1)), >=critical=critical (0 → reap this
sweep). New DEFAULT_MEM_CRITICAL_PCT=95 + PRISM_FLEET_REAPER_MEM_CRITICAL_PCT
env knob, wired through resolveConfig/clampInt/result/summarize/usage/JSDoc.

Strictly additive + backward-compatible: below criticalPct the gate is
byte-identical to the pre-MS1 binary (proven by an in-test legacy
reimplementation). Fail-safe by construction (R12): non-finite/negative
usedPct → normal/full-killAfter (a blind memory read never escalates reaping);
criticalPct<warnPct misconfig clamps up (collapse, never invert). `underPressure`
semantics preserved (now warn|critical); critical surfaced additively as
pressureTier/criticalPressure.

16/16 node:test (boundaries, fail-modes, monotonicity invariant, legacy parity).
Per-file 2-reviewer scrutiny PASS (0 P0/P1; P2 doc-rot + crit==warn test fixed).
Live host smoke @95.2% mem → pressureTier=critical, effKillAfter=0.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- scripts/__tests__/fleet-reaper-tier.test.mjs | 166 +++++++++++++++++++++++++++
- scripts/fleet-reaper-sweep.mjs               |  71 ++++++++++--
- 2 files changed, 229 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f4ab9e01d986`
- Milestone envelope: `mcp-server/data/milestones/FLEET-REAPER-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._