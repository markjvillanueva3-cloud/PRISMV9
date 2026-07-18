# PSN-SYNERGY-COLLECT-MS2/U-OBSIDIAN-TRIBAL-EDGES-TESTS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS2]/U-OBSIDIAN-TRIBAL-EDGES-TESTS (slot:alpha): companion tests + hardening from 3-of-3 P2 findings

**Commit:** `269676e22757` · **By:** markjvillanueva3-cloud · **At:** 2026-06-02T19:14:44-05:00
**Tags:** psn-synergy-collect-ms2, u-obsidian-tribal-edges-tests, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS2]/U-OBSIDIAN-TRIBAL-EDGES-TESTS (slot:alpha): companion tests + hardening from 3-of-3 P2 findings

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS2]/U-OBSIDIAN-TRIBAL-EDGES-TESTS (slot:alpha): companion tests + hardening from 3-of-3 P2 findings

Implements the P2 follow-ups all three scrutiny reviewers flagged on 511c6b2fa2:
- R9 companion test scripts/psn-synergy-collect.test.mjs (7 cases, 7/7 pass):
  countNeedleStreaming boundary-split (7 chunk sizes), adjacency, zero-match,
  fail-soft missing file; scanObsidianOutEdges real-ref tally + the honesty case
  (bare word 'formula' must NOT count as a formulas-leg edge) + empty input.
- countNeedleStreaming hardened: CHUNK floored to needle.length (kills the
  sub-needle degenerate regime the reviewers found at tiny chunks; no-op at 1MiB),
  openSync now fail-soft (returns 0, TOCTOU-safe — arm A P3) instead of throwing.
- collectTribalLeg large-file branch never falls through to JSON.parse (arm A P2);
  continues to next candidate path instead.
- collector helpers exported + main() behind a CLI-only guard so tests import the
  pure functions without triggering a full disk scan.

Tests verify intent (R9), not vanity: the formulas assertion fails if the pattern
ever regresses to matching the english word again.
```

## Files touched (5)
- scripts/psn-synergy-collect.mjs        | 26 +++++++++++++++++++++-----
- scripts/psn-synergy-collect.test.mjs   | 93 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/psn-synergy-snapshot.json |  4 ++--
- state/shared/psn-synergy-snapshot.md   |  4 ++--
- 4 files changed, 118 insertions(+), 9 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 269676e22757`
- Milestone envelope: `mcp-server/data/milestones/PSN-SYNERGY-COLLECT-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._