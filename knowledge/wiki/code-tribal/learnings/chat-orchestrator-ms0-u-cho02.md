# CHAT-ORCHESTRATOR-MS0/U-CHO02 — [MAIN] [CHAT-ORCHESTRATOR-MS0]/U-CHO02: per-chat token-usage estimator + pressure classifier — 26/26 tests

**Commit:** `5ece125d8b34` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T17:24:27-05:00
**Tags:** chat-orchestrator-ms0, u-cho02, auto-distilled

## Subject
[MAIN] [CHAT-ORCHESTRATOR-MS0]/U-CHO02: per-chat token-usage estimator + pressure classifier — 26/26 tests

## Body
```
[MAIN] [CHAT-ORCHESTRATOR-MS0]/U-CHO02: per-chat token-usage estimator + pressure classifier — 26/26 tests

Reads transcript JSONL, finds the last "isCompactSummary":true boundary (same fix as 2026-05-15 precompact-auto-trigger compact-boundary regression), estimates post-compact tokens from bytes, classifies pressure into clean/warn/critical against operator-tunable thresholds (defaults: warn 800K, critical 940K — matches AUTOCOMPACT-AUTONOMOUS-MS0 SOFT/HARD).

Exports (all pure / pure-core+injected-IO):
  * findLastCompactOffsetInBuffer(buf, bufStartOffset) — scans for last needle, returns byte offset of post-compact content; takes a passed-in Buffer so tests can pass synthetic transcripts
  * estimateTokens(bytes, bytesPerToken=3.5) — floor division, safe-default 0 on invalid
  * classifyPressure(tokens, warnAt, critAt) — banded; mis-ordered thresholds clamped via max(c,w); boundary semantics tested
  * readTranscriptBytes(sessionId, {projectsDir, _io}) — small files full-load, large (>4MB) files tail-read (256KB window) to avoid memory blowup at 95-99% pressure; injectable IO for tests
  * readChatPressure(sessionId, {slot, _env, _io}) — top-level composition; honours env knobs PRISM_CHAT_TOKEN_{WARN_AT,CRITICAL_AT,BYTES_PER_TOK,DISABLE}; kill-switch returns clean+0 stub

Conservative-by-design (R12): unknown / corrupt / missing transcript → clean+0 with error surfaced in result. Large file with boundary outside tail window → over-estimates from totalBytes (surfaces critical earlier — safe direction for a pressure signal).

Tests cover: 6 buffer-scan edge cases (no boundary / single / multiple / last-line / empty / null), 9 estimator+classifier cases (defaults / custom / boundaries / mis-ordered / invalid), 8 transcript-read cases (missing / invalid / small w+wo compact / empty / large-with-tail-boundary / large-without), 5 integration cases (kill-switch / clean / critical / env-threshold / shape).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- scripts/lib/chat-token-watch.mjs      | 240 ++++++++++++++++++++++++++
- scripts/lib/chat-token-watch.test.mjs | 314 ++++++++++++++++++++++++++++++++++
- 2 files changed, 554 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5ece125d8b34`
- Milestone envelope: `mcp-server/data/milestones/CHAT-ORCHESTRATOR-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._