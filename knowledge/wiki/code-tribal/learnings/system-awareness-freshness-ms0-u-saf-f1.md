# SYSTEM-AWARENESS-FRESHNESS-MS0/U-SAF-F1 — [MAIN] [SYSTEM-AWARENESS-FRESHNESS-MS0]/U-SAF-F1: Stop-hook advisory for awareness-layer staleness regressions

**Commit:** `524a2f806de6` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T23:25:54-05:00
**Tags:** system-awareness-freshness-ms0, u-saf-f1, auto-distilled

## Subject
[MAIN] [SYSTEM-AWARENESS-FRESHNESS-MS0]/U-SAF-F1: Stop-hook advisory for awareness-layer staleness regressions

## Body
```
[MAIN] [SYSTEM-AWARENESS-FRESHNESS-MS0]/U-SAF-F1: Stop-hook advisory for awareness-layer staleness regressions

Detects whether a session introduced new staleness vs the baseline snapshot.
Sister to ## Recent regressions inbox pattern — fires once per 4h global throttle,
fail-OPEN by construction (missing baseline / spawn error / parse error all
exit 0 silently). NEVER blocks Stop — advisory-only via systemMessage.

Compares fresh 7-day audit vs latest SYSTEM-AWARENESS-FRESHNESS-BASELINE-*.json:
  - high-severity finding count delta (regression detection)
  - new category-1 milestone tokens (CLAUDE.md missing summaries)
  - dropped tokens (improvement signal — good news in advisory)

Knobs:
  PRISM_SAF_STOP_DISABLE=1        — turn off entirely
  PRISM_SAF_STOP_THROTTLE_MS=N    — override 4h window
  PRISM_SAF_STOP_BASELINE=path    — override baseline path

Tests: 28/28 pass via node:test. Coverage:
  - throttleAllows: 5 (happy/below/above/boundary/NaN-fail-open)
  - pickLatestBaseline: 3 (lex-sort/no-matches/non-array)
  - computeDelta: 5 (identity/regression/improvement/malformed/sample-cap)
  - formatAdvisory: 5 (regression/null/improvement-only/good-news/null-input)
  - hook E2E subprocess oracle: 5 (disable/missing-baseline/malformed/empty-stdin/huge-throttle)
  - adversarial: 2 (10k findings no-OOM / NaN env var)
  - variability: 3 (severity sets / category sets / empty)

Wired:
  C:/Users/wompu/.claude/settings.json + H:/.claude/settings.json
  Stop arm using portable-node, timeout 5000ms. Total Stop arms: 3.

Closes U-SAF-F1 of SYSTEM-AWARENESS-FRESHNESS-MS0 (state/shared/specs/SYSTEM-AWARENESS-FRESHNESS-MS0.md). Next iter: U-SAF-F2 scheduled-task daily cron.
```

## Files touched (3)
- .claude/hooks/stop-system-awareness-freshness.mjs  | 211 +++++++++++++++
- .../hooks/stop-system-awareness-freshness.test.mjs | 291 +++++++++++++++++++++
- 2 files changed, 502 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 524a2f806de6`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-AWARENESS-FRESHNESS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._