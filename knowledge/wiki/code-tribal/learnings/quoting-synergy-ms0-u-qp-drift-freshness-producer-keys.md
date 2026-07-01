# QUOTING-SYNERGY-MS0/U-QP-DRIFT-FRESHNESS-PRODUCER-KEYS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-DRIFT-FRESHNESS-PRODUCER-KEYS (slot:charlie): fix T16 -- driftFreshness read the WRONG producer keys, masking every real drift alert as unknown/ok.

**Commit:** `bff00a6147a5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T08:41:12-05:00
**Tags:** quoting-synergy-ms0, u-qp-drift-freshness-producer-keys, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-DRIFT-FRESHNESS-PRODUCER-KEYS (slot:charlie): fix T16 -- driftFreshness read the WRONG producer keys, masking every real drift alert as unknown/ok.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-DRIFT-FRESHNESS-PRODUCER-KEYS (slot:charlie): fix T16 -- driftFreshness read the WRONG producer keys, masking every real drift alert as unknown/ok.

REAL bug (the re-mine surfaced it correctly, unlike the 6 stale already-done claims). generate-quoting-awareness.mjs driftFreshness() read the timestamp under generatedAt|timestamp|ts|updatedAt and the level under top-level `level`. But the producer buildDriftStateFile (quoting-train-drift-alert.mjs, iter15) emits the on-disk latest-drift-alert.json as { schema_version, ts_iso, alert:{level}, summary } -- timestamp at `ts_iso`, level NESTED at `alert.level`. Neither producer key matched -> Date.parse(undefined)=NaN -> state always fell to "unknown" / "drift-alert has no parseable timestamp" despite a valid ts_iso sitting right there, AND after a timestamp-only fix a real "warn"/"alert" would have masked as "ok" (R12: a masked live alert is worse than unknown). This is the same producer/consumer field-drift class the T5 test was built to catch.

Why it was never caught: the pre-existing driftFreshness tests used generatedAt + top-level level -- a shape the live producer NEVER emits (R9 violation: tested a fictional contract). The QUOTING-AWARENESS headline "drift state: unknown" was the live symptom.

Fix: read producer keys FIRST -- ts_iso || generatedAt || timestamp || ts || updatedAt for the timestamp; (alert.level) || level for the level -- legacy keys kept as back-compat fallback. 2 R9 red-green tests added: (1) the REAL producer shape (ts_iso + alert.level) -> finite ageHours=3, fresh, state="warn" (RED before fix: state="unknown"/null); (2) legacy generatedAt + top-level level still works. 13/13 green (was 12/13 with the new contract test RED). Pure function, no behavior change for already-correct callers.

OPEN-THREADS T16 -> DONE. Next executable by ROI = T4 (cron Stage0 baseline rewire, verify poisoned-source claim first). Script + test + doc only, no engine/dispatcher source.
```

## Files touched (4)
- mcp-server/src/engines/quoting/OPEN-THREADS.md |  4 ++--
- scripts/generate-quoting-awareness.mjs         | 12 +++++++++---
- scripts/generate-quoting-awareness.test.mjs    | 31 +++++++++++++++++++++++++++++++
- 3 files changed, 42 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- WRONG producer keys, masking every real drift alert as unknown/ok.
- till works. 13/13 green (was 12/13 with the new contract test RED). Pure function, no behavior change for already-correct callers.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bff00a6147a5`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._