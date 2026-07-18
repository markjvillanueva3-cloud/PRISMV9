# COMMAND-KERNEL-MS0/U-CK29 — [MAIN] [COMMAND-KERNEL-MS0]/U-CK29 (slot:mike): close cross-session learning loop — record(event=outcome) tees to os/sessions/<sid>.jsonl + recommend mines journals

**Commit:** `36645c59a16c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T11:56:55-05:00
**Tags:** command-kernel-ms0, u-ck29, auto-distilled

## Subject
[MAIN] [COMMAND-KERNEL-MS0]/U-CK29 (slot:mike): close cross-session learning loop — record(event=outcome) tees to os/sessions/<sid>.jsonl + recommend mines journals

## Body
```
[MAIN] [COMMAND-KERNEL-MS0]/U-CK29 (slot:mike): close cross-session learning loop — record(event=outcome) tees to os/sessions/<sid>.jsonl + recommend mines journals

U-CK29 (phase 4) — exits the U-CK15+ placeholder. syscall_record now tees
event=outcome entries to knowledge/wiki/os/sessions/<sid>.jsonl when a
sessionId is supplied; syscall_recommend reads all session journals,
scores by keyword overlap against query tokens, tie-breaks newest first,
and returns top-K (clamped [1, RECOMMEND_MAX_K=50]) analogies. Files over
RECOMMEND_MAX_BYTES_PER_FILE=1MB are tail-read to bound memory.

Closed exit conditions:
  - session outcomes route to memory + os/sessions/ journal
  - psk recommend retrieves analogies from promoted memory
  - the cross-session learning loop is closed

Hardening:
  - SESSION_ID_RE whitelist rejects directory-traversal at the boundary
  - journal-append failure is non-fatal — telemetry already landed
  - JSON.parse failures in journals are silently skipped per line

Tests (12/12 PASS via node --test):
  .claude/kernel/psk-u-ck29.test.mjs — journal tee, no-tee on
  non-outcome, no-sid path, dir-traversal reject, multi-entry append,
  query scoring, no-query recency, k-clamp, empty dir, malformed JSONL,
  e2e record->recommend, cross-session retrieval. Hermetic via
  PRISM_OS_SESSIONS_DIR + PRISM_TELEMETRY_PATH tmpdir overrides.

Regression: existing psk.test.mjs 11/11 PASS unchanged.

Mid-build R12 honesty: test withEnv helper had a try/finally async race
(finally restored env before fn's awaits resolved); fixed inline.
```

## Files touched (5)
- .claude/hooks/token-awareness-sidecar.mjs          |  29 ++-
- .claude/kernel/psk-u-ck29.test.mjs                 | 280 +++++++++++++++++++++
- .claude/kernel/psk.mjs                             | 164 +++++++++++-
- mcp-server/data/milestones/COMMAND-KERNEL-MS0.json |  20 +-
- 4 files changed, 478 insertions(+), 15 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 36645c59a16c`
- Milestone envelope: `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._