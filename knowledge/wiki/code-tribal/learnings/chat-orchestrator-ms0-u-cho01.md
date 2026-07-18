# CHAT-ORCHESTRATOR-MS0/U-CHO01 — [MAIN] [CHAT-ORCHESTRATOR-MS0]/U-CHO01: pure decision module (clear/compact + respawn) — 25/25 tests

**Commit:** `85703afab633` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T17:18:40-05:00
**Tags:** chat-orchestrator-ms0, u-cho01, auto-distilled

## Subject
[MAIN] [CHAT-ORCHESTRATOR-MS0]/U-CHO01: pure decision module (clear/compact + respawn) — 25/25 tests

## Body
```
[MAIN] [CHAT-ORCHESTRATOR-MS0]/U-CHO01: pure decision module (clear/compact + respawn) — 25/25 tests

Smallest+most-testable piece of the new fleet chat-orchestrator. Two no-IO pure fns + 2 helper exports + invariant-guarded action taxonomy.

decideClearOrCompact(chatState) — pressure-level + continuity-state → noop|advise-only|clear|compact. Decision tree: clean=noop; warn=advise; critical+(loop|uncommitted|handoff)=compact; critical+clean=clear (cheaper). Strict-equality continuity flags safe-degrade to clear; missing/unknown pressure → advise-only.

decideRestartAction(slotState) — chat-slots status + claude-alive + window-alive + pin → respawn|skip-alive|skip-still-claim|skip-unrecoverable|skip-unknown. 30s claim-race window prevents premature respawn; respawn requires BOTH window-alive AND pin (golf needs to know WHICH window to spawn into); crashed-without-window or crashed-without-pin → skip-unrecoverable (operator must re-/checkin manually).

SAFE_ACTIONS vs REACHING_ACTIONS — taxonomy invariant: every recommendation is either side-effect-safe (noop, advise-only, skip-*) or reaches a target chat (clear, compact, respawn). Sets are disjoint. The matrix test exercises 4×2×2×2 = 32 decideClearOrCompact and 4×2×2×2×2 = 64 decideRestartAction state combinations and verifies every output is classified.

Doctrine: golf is an ORCHESTRATOR not a SEIZER. Decisions never recommend action outside the orchestrator's authorized reach — REACHING_ACTIONS require either the chat's opted-in advisory hook (U-CHO06 coming) or explicit UI Automation (U-CHO04 coming).

R12 fail-loud: null/missing/unknown inputs return a SAFE default (noop/advise-only/skip-unknown) and surface the reason in the {action,reason} return — never throws, never guesses.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (8)
- mcp-server/data/milestones/CAM-PARITY-AGI-MS0.json |  35 ++-
- scripts/lib/chat-orchestrator-decisions.mjs        | 160 ++++++++++++++
- scripts/lib/chat-orchestrator-decisions.test.mjs   | 235 +++++++++++++++++++++
- state/shared/BUILD_STATE.json                      | 144 ++++++-------
- state/shared/BUILD_STATE.md                        |  22 +-
- state/shared/CLOSE-OUT-CANDIDATES.json             | 148 +++++++------
- state/shared/CLOSE-OUT-CANDIDATES.md               |  29 +--
- 7 files changed, 587 insertions(+), 186 deletions(-)

## Lessons surfaced in commit body
- till-claim|skip-unrecoverable|skip-unknown. 30s claim-race window prevents premature respawn; respawn requires BOTH window-alive AND pin (golf needs to know WHICH window to spawn into); crashed-without-window or crashed-without-pin → skip-unrecoverable (operator must re-/checkin manually).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 85703afab633`
- Milestone envelope: `mcp-server/data/milestones/CHAT-ORCHESTRATOR-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._