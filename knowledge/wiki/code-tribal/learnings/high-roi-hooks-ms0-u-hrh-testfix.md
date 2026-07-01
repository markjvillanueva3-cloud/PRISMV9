# HIGH-ROI-HOOKS-MS0/U-HRH-TESTFIX — [MAIN] [HIGH-ROI-HOOKS-MS0]/U-HRH-TESTFIX: hermetic per-process test cache dir (closes 3-of-3 flake)

**Commit:** `7e081523d9c1` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T22:26:21-05:00
**Tags:** high-roi-hooks-ms0, u-hrh-testfix, auto-distilled

## Subject
[MAIN] [HIGH-ROI-HOOKS-MS0]/U-HRH-TESTFIX: hermetic per-process test cache dir (closes 3-of-3 flake)

## Body
```
[MAIN] [HIGH-ROI-HOOKS-MS0]/U-HRH-TESTFIX: hermetic per-process test cache dir (closes 3-of-3 flake)

3-of-3 arm B+C FAIL: the two test suites' subprocess oracles flaked ~15-65% when run together under 'node --test' default concurrency (hooks proven correct — 0/72 wrong decisions; flake was cross-suite cache-dir contention + live-fleet-cache pollution). Fix: CACHE_DIR is now env-overridable (PRISM_BUILD_CACHE_DIR / PRISM_MCP_CACHE_DIR); each suite runs in an os.tmpdir() per-process dir, cleaned by after(). Re-verified 5/5 both-files-together = 59/59. Also: fmtAge magic number -> AGE_SEC_THRESHOLD const; wiki oracle count 6->9 (R12).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (6)
- .claude/hooks/build-cache-guard.mjs               |  5 ++++-
- .claude/hooks/build-cache-guard.test.mjs          | 16 +++++++++++++---
- .claude/hooks/mcp-readonly-cache.mjs              |  9 +++++++--
- .claude/hooks/mcp-readonly-cache.test.mjs         | 16 +++++++++++++---
- knowledge/wiki/architecture/high-roi-hooks-ms0.md |  6 +++---
- 5 files changed, 40 insertions(+), 12 deletions(-)

## Lessons surfaced in commit body
- wrong decisions; flake was cross-suite cache-dir contention + live-fleet-cache pollution). Fix: CACHE_DIR is now env-overridable (PRISM_BUILD_CACHE_DIR / PRISM_MCP_CACHE_DIR); each suite runs in an os.tmpdir() per-process dir, cleaned by after(). Re-verified 5/5 both-files-together = 59/59. Also: fmtAge magic number -> AGE_SEC_THRESHOLD const; wiki oracle count 6->9 (R12).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7e081523d9c1`
- Milestone envelope: `mcp-server/data/milestones/HIGH-ROI-HOOKS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._