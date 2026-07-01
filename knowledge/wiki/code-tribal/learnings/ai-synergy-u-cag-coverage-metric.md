# AI-SYNERGY/U-CAG-COVERAGE-METRIC — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY]/U-CAG-COVERAGE-METRIC (slot:zulu): make CAG cold-anchor synergy MEASURABLE (closes the unmeasured-cold-hit gap)

**Commit:** `688dd8badf81` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T23:35:33-05:00
**Tags:** ai-synergy, u-cag-coverage-metric, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY]/U-CAG-COVERAGE-METRIC (slot:zulu): make CAG cold-anchor synergy MEASURABLE (closes the unmeasured-cold-hit gap)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY]/U-CAG-COVERAGE-METRIC (slot:zulu): make CAG cold-anchor synergy MEASURABLE (closes the unmeasured-cold-hit gap)

Goal clause: improve CAG + synergy with prism awareness across all galaxies. The cold
anchor (cag-cold-cache-anchor.mjs) records WHICH cold-tier doctrine sources it anchors
per session into 500 per-session sidecars, but nothing aggregated them -- the
loop-eng-gaps assessment flagged 'you cannot currently measure the cold-hit rate'.

scripts/cag-cold-anchor-coverage.mjs aggregates the sidecars into a deterministic
coverage metric: per-source presence rate across recent sessions (worst-covered first =
the actionable gap), overall coverage, avg cold bytes anchored/session. Pure testable
core (aggregateCoverage) + fail-soft loaders + canonical report at
state/shared/cag-route/COLD-ANCHOR-COVERAGE.json. Fleet-wide / all-galaxy (the cold
anchor carries claude-md + wiki-index + galaxy-cards + memory-md = per-galaxy awareness).

VALIDATED on the live 500 sidecars: overall-presence=100.0%, 9 sources all 100%
(claude-md/memory-md/engine-digest/dispatcher-digest/physics-constants/wiki-index/
tribal-tips/galaxy-cards/galaxy-digest), avg 4423KB cold-anchored/session -- the CAG
synergy is now a number, and a healthy one. 6/6 tests (presence-rate, worst-first sort,
present-only byte avg, empty/malformed fail-soft, load-reject, windowed buildReport).
Follow-up (noted, not done): cron the report + feed it to a synergy dashboard.
```

## Files touched (3)
- scripts/cag-cold-anchor-coverage.mjs      | 130 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/cag-cold-anchor-coverage.test.mjs |  97 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 227 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 688dd8badf81`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._