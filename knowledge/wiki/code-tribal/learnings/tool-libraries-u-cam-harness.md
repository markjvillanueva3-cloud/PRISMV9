# TOOL-LIBRARIES/U-CAM-HARNESS — [MAIN-FORCE] [TOOL-LIBRARIES]/U-CAM-HARNESS (slot:romeo): emit+validate harness for all 3 CAM formats

**Commit:** `cbd335b974ad` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T08:54:20-05:00
**Tags:** tool-libraries, u-cam-harness, auto-distilled

## Subject
[MAIN-FORCE] [TOOL-LIBRARIES]/U-CAM-HARNESS (slot:romeo): emit+validate harness for all 3 CAM formats

## Body
```
[MAIN-FORCE] [TOOL-LIBRARIES]/U-CAM-HARNESS (slot:romeo): emit+validate harness for all 3 CAM formats

Iter 5 -- the operator's requested 'harness'. One repeatable, cron-safe command that regenerates
every per-brand library AND structurally validates each emitted file (R15 VALIDATE), exit 1 on
any failure. The regenerable replacement for the now-MISSING 2026-06-15 generate-fullcorpus-*.ts
scripts (verified absent from scripts/; the placed PRISM_FULLCORPUS.* in the seats are stale +
not regenerable). Adds the geometry-plausibility gate that earlier export lacked (it only NaN->0'd,
so it likely shipped garbage diameters like the YG1-380mm drill into the seats).

- Synchronous + portable (no native bindings / no --experimental-sqlite): fusion=JSON parse +
  DC check; hypermill=structural SQL (Tools DDL + 13-field INSERT arity, string-literal-aware
  comma split); mastercam=CSV header+arity+Diameter parse. Deep SQLite round-trip already proven
  in iter 3 + emitter tests.
- LIVE: emit+validate all 3 formats -> 19/19 files each valid, 61,246 tools each, exit 0.
- Tests: harness 7/7 (validators + hermetic runHarness + corrupt-file catch); self-test 14/14.

NOTE (R8 dedup, honest): this complements -- does not duplicate -- the 2026-06-15 full-corpus
export (combined-per-format, into seats) and the JM-crib audit-jm-cam-libraries.mjs. My track is
per-brand + plausibility-gated + regenerable + tested. Next: placement into seats + nightly cron.
```

## Files touched (4)
- scripts/cam-tool-library-harness.mjs            | 202 ++++++++++++++++++++++++++++++++++++++++++++++
- scripts/cam-tool-library-harness.test.mjs       |  94 +++++++++++++++++++++
- state/shared/tool-libraries/HARNESS-REPORT.json |  23 ++++++
- 3 files changed, 319 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cbd335b974ad`
- Milestone envelope: `mcp-server/data/milestones/TOOL-LIBRARIES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._