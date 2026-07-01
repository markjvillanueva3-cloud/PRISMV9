# SIERRA-VIZ/U-VIZ-FRESHNESS-HARDEN — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-FRESHNESS-HARDEN (slot:sierra): close 2 scrutiny P2s -- postflight<->audit threshold parity + un-fragile extractArrayBody (comment/string brackets)

**Commit:** `e7f12c4ef622` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T11:12:15-05:00
**Tags:** sierra-viz, u-viz-freshness-harden, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-FRESHNESS-HARDEN (slot:sierra): close 2 scrutiny P2s -- postflight<->audit threshold parity + un-fragile extractArrayBody (comment/string brackets)

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-FRESHNESS-HARDEN (slot:sierra): close 2 scrutiny P2s -- postflight<->audit threshold parity + un-fragile extractArrayBody (comment/string brackets)

The iter-13 3-of-3 surfaced 2 non-blocking P2s; this closes both (R16 fit-the-whole).

P2 #1 -- THRESHOLD PARITY: the freshness postflight passed only {dir} (FRESHNESS_DEFAULTS),
while audit-augmentation-freshness.mjs honored PRISM_AUG_{FRESH,STALE,SLOW}_HR env overrides ->
an operator who tuned a knob got two DIVERGENT stale counts (regen says N, audit says M). Added
a single-source `freshnessThresholdsFromEnv(env)` to the lib; both the postflight AND the audit
now read thresholds through it (de-dups the audit's inline envHr too). PROVEN: with
PRISM_AUG_STALE_HR=2000 both report staleOrphan=0 (pre-fix the postflight would have said 2).

P2 #2 -- PARSER FRAGILITY (pre-existing, in the iter-1 dual-reg lib): extractArrayBody counted
raw [ / ] over source INCLUDING strings + comments -- it survived only because every comment
bracket in HEAVY[] was a balanced "FAST[]" pair. An UNBALANCED `[` in a future comment (e.g.
"// [deprecated") would drive depth past 0 -> never reach 0 -> return null -> parseGeneratorArray
returns [] (the dual-reg auditor + drift-guard both silently mis-parse). This is the SAME
comment-bracket class that broke the drift-guard's regex (and the zulu parseShipped prose-miscount).
Rewrote extractArrayBody as a state machine that counts brackets ONLY outside string literals +
line/block comments. Backward-compatible (live FAST 104 / HEAVY 5 unchanged).

Tests: augmentation-freshness 16/16 (+freshnessThresholdsFromEnv: defaults/valid-override/invalid-
fallback), dual-reg auditor 13/13 (+brackets-in-comments-never-truncate, fails on the old raw count),
regen-viz-fast-order 4/4. Audit output byte-identical (2 stale-orphan) -- refactor behavior-preserving.
```

## Files touched (7)
- scripts/audit-augmentation-freshness.mjs         | 23 ++++++-----------------
- scripts/lib/augmentation-freshness.mjs           | 20 ++++++++++++++++++++
- scripts/lib/augmentation-freshness.test.mjs      | 20 ++++++++++++++++++++
- scripts/lib/viz-dual-registration-audit.mjs      | 23 ++++++++++++++++++++---
- scripts/lib/viz-dual-registration-audit.test.mjs | 14 ++++++++++++++
- scripts/regen-viz.mjs                            |  3 ++-
- 6 files changed, 82 insertions(+), 21 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e7f12c4ef622`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._