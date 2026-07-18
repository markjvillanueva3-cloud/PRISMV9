---
name: reference_post_ship_quoting-synergy-ms0-u-qp-alert-banner
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-ALERT-BANNER (commit d74521aa4). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.004Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-alert-banner
---


# QUOTING-SYNERGY-MS0/U-QP-ALERT-BANNER

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-ALERT-BANNER (slot:charlie /goal-yolo iter28): pure-function formatter turns latest-drift-alert.json into SessionStart-compatible markdown block + 20 tests. Future iter wires as a SessionStart hook (closes iter22 follow-up #5); today ships standalone (avoids touching peer-contended hooks dir). Exports: formatAlertBanner(state, opts)->{shouldInject, text, reason} (pure, defensive against null/non-object/missing-fields), loadAndFormatAlert(path, opts)->Promise<same> (parses file, silent on missing, diagnostic banner on parse-error). Behavior matrix: alert -> 🚨 + reasons + summary stats + triage pointer · warn -> ⚠ (lighter) · info silent unless --verbose · ok silent · STALE (>48h since last update) -> 🕰 banner overriding level. Real bug caught + fixed by test: Math.round(staleHours) before > compare let 48h+1m slip through; fix uses raw fractional hours for the comparison, rounded value only for display. CLI: --state PATH, --verbose, --json, --force (emit even when silent). 20/20 tests PASS: 4 alert levels distinct (ok/info silent, warn/alert emit), null/undefined/non-object defenses, ALERT body contains reasons + summary stats + triage pointer, WARN icon distinct from ALERT, summary mape/trend/cov/safe stats included, staleness detection (>48h flags, <48h doesn't, boundary 48h+1m correctly flags), invalid ts_iso doesn't crash, missing alert/reasons defenses, non-array reasons treated as empty, stable 3-key shape, loadAndFormatAlert missing-file silent, parse-error diagnostic banner. Total iter9-28: 275 tests across 14 test files + 1 verify runner.

**Shipped:** 2026-05-26T04:10:20-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[quoting-synergy-ms0-u-qp-alert-banner]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._