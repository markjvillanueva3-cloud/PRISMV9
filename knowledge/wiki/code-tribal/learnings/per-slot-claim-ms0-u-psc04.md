# PER-SLOT-CLAIM-MS0/U-PSC04 — [MAIN] [PER-SLOT-CLAIM-MS0]/U-PSC04+U-PSC05: post-commit auto-release + Stop-time advisory (18 tests)

**Commit:** `b6f24770cc9b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T16:15:55-05:00
**Tags:** per-slot-claim-ms0, u-psc04, auto-distilled

## Subject
[MAIN] [PER-SLOT-CLAIM-MS0]/U-PSC04+U-PSC05: post-commit auto-release + Stop-time advisory (18 tests)

## Body
```
[MAIN] [PER-SLOT-CLAIM-MS0]/U-PSC04+U-PSC05: post-commit auto-release + Stop-time advisory (18 tests)

Two-unit ship completing the auto-release + visibility loop for the per-slot claim system. Builds on commit 3a8741d4f (U-PSC01 CLI + U-PSC02 pick-unit filter).

U-PSC04 — Post-commit hook auto-release.
  - scripts/slot-task-claim-release-on-commit.mjs: parses the latest commit subject for [MILESTONE]/U-ID patterns (incl. `[MAIN]` prefix + combined `U-A+U-B+U-C`), resolves the owner from chat-slots.json most-recent-heartbeat, releases each matching claim via the U-PSC01 CLI. Fail-modes handled: missing CLI → silent, no [SCOPE]/U-ID match → silent, peer-owned → stderr advisory (no release), wrong CLI exit code → stderr (best-effort, never blocks commit).
  - Wired in `.git/hooks/post-commit` under managed `PER-SLOT-CLAIM-MS0/U-PSC04 SLOT-TASK-CLAIM AUTO-RELEASE` marker block; runs in background, exit code ignored.
  - 10/10 node:test PASS — parser covers happy path, [MAIN] prefix, combined unit-ids, dedupe, hostile-input bound, multi-line subjects, empty/null inputs.

U-PSC05 — Stop-time claims advisory.
  - .claude/hooks/stop-slot-task-claims-advisory.mjs: T3 advisory at Stop. Surfaces this slot's active claims with TTL categorization (⏳ expiring-soon ≤30min, • long-term) + release-command hint. Strictly non-blocking — no-claim path returns {continue:true,suppressOutput:true}; with-claims path returns {continue:true,suppressOutput:false,hookSpecificOutput.additionalContext}. Throttled per-session (10min default knob PRISM_SLOT_TASK_ADVISORY_THROTTLE_MS).
  - Identity resolution: matches session_id first-8-hex → claude-<8hex> chatId across chat-slots.json; fallback to most-recent heartbeat.
  - Wired in both C: + H: settings.json Stop[0].hooks[12], inline after session-end-peer-share per [[reference_stop_advisory_wiring_cluster_2026_05_15]] cluster doctrine. Stop chain now 41 hooks (was 40). Verified the no-finding path returns the safe shape BEFORE wiring per the zero-risk wiring rule.
  - 8/8 node:test PASS — identifyOwner session-id matching + heartbeat fallback + missing data paths; formatAdvisory TTL-categorization + cap-at-5-per-bucket + release-command hint.

Knobs:
  PRISM_SLOT_TASK_ADVISORY_DISABLE=1    — skip Stop advisory entirely
  PRISM_SLOT_TASK_ADVISORY_VERBOSE=1    — emit even with 0 claims (debug)
  PRISM_SLOT_TASK_ADVISORY_THROTTLE_MS=N

Coverage of PER-SLOT-CLAIM-MS0 progress: 4/6 units shipped.
  ✓ U-PSC01 storage + CLI (commit 3a8741d4f)
  ✓ U-PSC02 pick-unit filter (commit 3a8741d4f)
  ✓ U-PSC04 post-commit auto-release (this commit)
  ✓ U-PSC05 Stop-time advisory (this commit)
  ☐ U-PSC03 /checkin Step 12 integration (claim-on-pick, heartbeat-on-tick — pending)
  ☐ U-PSC06 real-data E2E race test (pending — partial coverage in U-PSC01.test)

End-to-end demo: 11 HTML units claimed to bravo (HTML-COMPANION-MS0 × 4 + HTML-PRIMARY-MS0 × 7) with 2h TTL. peer pick-unit invocations now see `peer-claimed 11` advisory.
```

## Files touched (5)
- .claude/hooks/stop-slot-task-claims-advisory.mjs   | 170 +++++++++++++++++++++
- .../hooks/stop-slot-task-claims-advisory.test.mjs  |  97 ++++++++++++
- scripts/slot-task-claim-release-on-commit.mjs      | 135 ++++++++++++++++
- scripts/slot-task-claim-release-on-commit.test.mjs |  72 +++++++++
- 4 files changed, 474 insertions(+)

## Lessons surfaced in commit body
- wrong CLI exit code → stderr (best-effort, never blocks commit).
- tile-input bound, multi-line subjects, empty/null inputs.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b6f24770cc9b`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-CLAIM-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._