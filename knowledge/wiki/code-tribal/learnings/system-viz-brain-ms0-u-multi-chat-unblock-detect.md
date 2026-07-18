# SYSTEM-VIZ-BRAIN-MS0/U-MULTI-CHAT-UNBLOCK-DETECT — [MAIN] [SYSTEM-VIZ-BRAIN-MS0]/U-MULTI-CHAT-UNBLOCK-DETECT: peer-commit unblock detector

**Commit:** `44ac1b52c9f4` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T08:32:53-05:00
**Tags:** system-viz-brain-ms0, u-multi-chat-unblock-detect, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ-BRAIN-MS0]/U-MULTI-CHAT-UNBLOCK-DETECT: peer-commit unblock detector

## Body
```
[MAIN] [SYSTEM-VIZ-BRAIN-MS0]/U-MULTI-CHAT-UNBLOCK-DETECT: peer-commit unblock detector

scripts/unblock-detect.mjs — reads roadmap-index.json milestones[] (each with
dependencies[] = milestone-id strings), classifies every milestone DONE/READY/
BLOCKED via a ONE-LEVEL dependency check (no recursion — a dependency cycle
cannot hang it), cross-refs recent git-log scoped [MILESTONE-ID] commits, and
emits a Markdown unblock report. Focus mode (--milestone M → is M unblocked, on
what is it waiting) + fleet mode (every READY pickup candidate, newly-unblocked
first). A dependency absent from the index is conservatively a blocker; an
unrecognized status is treated not-done — a not-actually-done dependency can
never let its dependent read READY. gitLogScoped returns {ok,commits} so a git
failure is distinguished from an empty log (fail-loud advisory). Operator-invoked
CLI, no hook wiring (per feedback_dont_wire_for_wiring_sake); reuses the generic
utils from sibling goal-ship-report.mjs.

scripts/unblock-detect.test.mjs — 49 node:test cases: all 8 exports; the
buildUnblockReport focus/fleet E2E; DONE/READY/BLOCKED classification incl. the
safety-critical direction; MAX_ROWS truncation surfaced-not-silent; the parseArgs
flag-eating guard; a hermetic git-fixture repo (tab-in-subject parse); adversarial
inputs (Markdown injection, ReDoS probe, oversize subject, self-dependency cycle,
duplicate ids); import-safety.

Per-file 2-arm scrutiny: file 1 PASS/PASS, file 2 PASS/PASS (round 2 after a
FAIL→fix — 3 P1s on each file resolved). 49/49 green.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- scripts/unblock-detect.mjs      | 485 ++++++++++++++++++++++++++++++++++++++
- scripts/unblock-detect.test.mjs | 506 ++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 991 insertions(+)

## Lessons surfaced in commit body
- tils from sibling goal-ship-report.mjs.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 44ac1b52c9f4`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-BRAIN-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._