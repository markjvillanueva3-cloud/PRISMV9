# ZULU-BUILDLOOP/U-ZBL-CRON-FAILLOUD — [MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-CRON-FAILLOUD (slot:bravo): zulu-build-loop spec-fallback + fail-loud ledger (overnight-workflows article upgrade)

**Commit:** `c2039c687292` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T09:51:25-05:00
**Tags:** zulu-buildloop, u-zbl-cron-failloud, auto-distilled

## Subject
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-CRON-FAILLOUD (slot:bravo): zulu-build-loop spec-fallback + fail-loud ledger (overnight-workflows article upgrade)

## Body
```
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-CRON-FAILLOUD (slot:bravo): zulu-build-loop spec-fallback + fail-loud ledger (overnight-workflows article upgrade)

Article-grounded cron hardening (state/shared/articles/2026-06-09-mikenevermiss-overnight-workflows-FULL.md):
"validate the data source -- a missing source must FAIL LOUD, not garbage-at-scale" (#3),
"log every failure, never continue/exit silently" (#1/#22), "structured workflow state:
content+status+timestamp+source are all mandatory" (#12/#24).

GAPS CLOSED (zulu-build-loop.mjs main()):
1. The spec path was hardcoded to a single dated file. On rotation/rename it read empty ->
   the cron silently emitted drained=true pending=0 (a phantom "all done"). NEW resolveSpec()
   prefers the configured/dated spec but falls back to the LATEST
   HERMES-CAPABILITY-EXPANSION-CANDIDATES-*.md (lexical-by-date) when it is missing/empty;
   returns null ONLY when no non-empty spec exists anywhere.
2. On no-spec, main() previously did `console.error + return 2` -- SILENT to a cron (no
   durable trace). Now it appends a `status:"failed"` ledger row with the reason, so a ledger
   monitor distinguishes "cron broken" from a real "drained".
3. The ledger row is now STRUCTURED via ledgerRecord(): at + status(ok|failed) + source +
   the existing content fields. Purely additive -- the prior next/pending/done/blocked/ollama
   fields are preserved (back-compat), status/source/specViaFallback added.

TEST (+7, 11/11): resolveSpec configured-exists / fallback-to-latest / empty-configured->fallback
/ none->null / .html-ignored; ledgerRecord ok-row 4-mandatory-fields + failed-row carries reason.
LIVE-VALIDATE: a missing-by-date configured path falls back to the real latest spec
(viaFallback:true); the real configured path resolves directly (viaFallback:false); the cron
run writes a structured status:"ok" row (keys: at/status/source/next/pending/done/blocked/ollama/
specViaFallback) and still reports DRAINED done=8.

First of a ranked article-grounded upgrade plan; remaining (own units): overlap-lock (G11),
stop-force-loop-continue regex m->s (G2), consensus-queue-drain fleet overlap-lock (#7/#8),
loop-state eval-gate+runaway-backstop, loop-iteration-inject anti-drift-every-5 (#17).
```

## Files touched (3)
- scripts/zulu-build-loop.mjs      | 105 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--------
- scripts/zulu-build-loop.test.mjs |  79 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 173 insertions(+), 11 deletions(-)

## Lessons surfaced in commit body
- till reports DRAINED done=8.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c2039c687292`
- Milestone envelope: `mcp-server/data/milestones/ZULU-BUILDLOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._