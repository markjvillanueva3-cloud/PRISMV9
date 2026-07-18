# BRAIN-REFRESH/U-SIERRA-BRAIN-HEALTH-INJECT — [MAIN-FORCE] [BRAIN-REFRESH]/U-SIERRA-BRAIN-HEALTH-INJECT (slot:sierra): gated SessionStart inject -- a FAILED overnight brain-refresh reaches every chat (silent when healthy)

**Commit:** `1a90e8bc6235` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T20:15:24-05:00
**Tags:** brain-refresh, u-sierra-brain-health-inject, auto-distilled

## Subject
[MAIN-FORCE] [BRAIN-REFRESH]/U-SIERRA-BRAIN-HEALTH-INJECT (slot:sierra): gated SessionStart inject -- a FAILED overnight brain-refresh reaches every chat (silent when healthy)

## Body
```
[MAIN-FORCE] [BRAIN-REFRESH]/U-SIERRA-BRAIN-HEALTH-INJECT (slot:sierra): gated SessionStart inject -- a FAILED overnight brain-refresh reaches every chat (silent when healthy)

Closes the auto-surface loop: the brain-health rollup (now reliably fresh via U-SIERRA-BRAIN-VHEALTH-STEP) was still only visible to whoever RAN vault-health. New SessionStart hook brain-health-inject.mjs reads state/shared/vault-health.json (NO subprocess) and injects ONLY on brain-MACHINERY failure -- a brain-refresh pipeline FAILED (names which), a brain-refresh-owned sentinel (rot/supersession) stale/missing, or the rollup itself >24h stale. SILENT in the healthy steady state AND on data-QUALITY content warns (supersession/contradiction/ambiguous) -> ~zero noise/load, high value only when the brain is actually broken. Live validation CAUGHT + FIXED a false positive: a stale non-core ambiguous-links row fired -> scoped stale/missing to CORE_MEASUREMENTS (rot/supersession/brain-refresh); ambiguous/contradiction run their own cadence so their lag is not a brain-refresh failure. 9/9 tests (incl the false-positive guard). Live: {} silent in the current healthy-machinery state. Wired in global ~/.claude SessionStart (mirrored C->H, JSON-validated both); knob PRISM_BRAIN_HEALTH_INJECT=0.
```

## Files touched (3)
- .claude/hooks/brain-health-inject.mjs      | 103 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/brain-health-inject.test.mjs |  75 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 178 insertions(+)

## Lessons surfaced in commit body
- till only visible to whoever RAN vault-health. New SessionStart hook brain-health-inject.mjs reads state/shared/vault-health.json (NO subprocess) and injects ONLY on brain-MACHINERY failure -- a brain-refresh pipeline FAILED (names which), a brain-refresh-owned sentinel (rot/supersession) stale/missing, or the rollup itself >24h stale. SILENT in the healthy steady state AND on data-QUALITY content wa

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1a90e8bc6235`
- Milestone envelope: `mcp-server/data/milestones/BRAIN-REFRESH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._