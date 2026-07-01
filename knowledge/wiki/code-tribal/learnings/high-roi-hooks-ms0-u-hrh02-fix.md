# HIGH-ROI-HOOKS-MS0/U-HRH02-FIX — [MAIN] [HIGH-ROI-HOOKS-MS0]/U-HRH02-FIX: strip NUL byte from UNDEF_SENTINEL literal

**Commit:** `8672514f1eab` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T21:56:20-05:00
**Tags:** high-roi-hooks-ms0, u-hrh02-fix, auto-distilled

## Subject
[MAIN] [HIGH-ROI-HOOKS-MS0]/U-HRH02-FIX: strip NUL byte from UNDEF_SENTINEL literal

## Body
```
[MAIN] [HIGH-ROI-HOOKS-MS0]/U-HRH02-FIX: strip NUL byte from UNDEF_SENTINEL literal

The U-HRH02 sentinel was authored as a leading-space string but the byte landed as \u0000 (NUL) at offset 4468 — git classified the file binary and the encoding-guard surface would choke. Functionally tolerated by node (25 tests stayed green) but wrong (R12). Sentinel is now plain ASCII '__undef__'; docstring em-dashes also normalized to ASCII. 0 NUL / 0 non-ascii bytes; 25/25 tests pass.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- .claude/hooks/mcp-readonly-cache.mjs | Bin 10983 -> 11134 bytes
- 1 file changed, 0 insertions(+), 0 deletions(-)

## Lessons surfaced in commit body
- wrong (R12). Sentinel is now plain ASCII '__undef__'; docstring em-dashes also normalized to ASCII. 0 NUL / 0 non-ascii bytes; 25/25 tests pass.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8672514f1eab`
- Milestone envelope: `mcp-server/data/milestones/HIGH-ROI-HOOKS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._